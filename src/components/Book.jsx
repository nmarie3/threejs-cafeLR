import { useMemo, useRef } from "react"
import { pageAtom, pages } from "./UI"
import { Bone, BoxGeometry, Float32BufferAttribute, MathUtils, MeshStandardMaterial, Skeleton, SkeletonHelper, SkinnedMesh, SRGBColorSpace, Uint16BufferAttribute, Vector3 } from "three";
import { useHelper, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { degToRad } from 'three/src/math/MathUtils';
import { roughness } from "three/examples/jsm/nodes/Nodes.js";
import { useAtom } from "jotai";
import { easing } from "maath";

//const lerpFactor = 0.05; //controls the speed of interpolation until we replace with easing
const easingFactor = 0.5 //controls the speed of the easing.
const insideCurveStrength = 0.18; //controls the strength of the curve
const outsideCurveStrength = 0.05; //controls the strength of the curve
const turningCurveStrength = 0.09; //controls the strength of the curve

const PAGE_WIDTH = 1.28;
const PAGE_HEIGHT = 1.71; //4:3 aspect ratio
const PAGE_DEPTH = 0.003;
const PAGE_SEGMENTS = 30; //number of bones
const SEGMENT_WIDTH= PAGE_WIDTH / PAGE_SEGMENTS;

const pageGeometry = new BoxGeometry(
    PAGE_WIDTH,
    PAGE_HEIGHT,
    PAGE_DEPTH,
    PAGE_SEGMENTS,
    2 //for hight segment?
);

//push geomertry from half to the left side "0"
pageGeometry.translate(PAGE_WIDTH / 2, 0, 0);

const position = pageGeometry.attributes.position; //get all postions of geometry that are located here
const vertex = new Vector3(); //declare a vertext so we don't instantiate one inside the loop
const skinIndexes = []; //create an array of indexes of our skins which are the bones
const skinWeights = []; //the associated weights for the above indexes

for (let i = 0; i < position.count; i++) {
    //ALL VERTICES
    vertex.fromBufferAttribute(position, i); //get vertex
    const x = vertex.x; //get the x position of vertex

    const skinIndex = Math.max(0, Math.floor(x / SEGMENT_WIDTH)); //calculate skin index. to know which bone will be affected. if close to 0 will use first bone, the firther away will be last bone
    let skinWeight = (x % SEGMENT_WIDTH) / SEGMENT_WIDTH;//calculate skin weight. the intensity of the bone is impacting the verticies. a value between 1-0.

    skinIndexes.push(skinIndex, skinIndex + 1, 0, 0); //set the skin indexes. the first index is the first bone that has an impacet and the second is the second bone with impact. you can have up to 4 bones on a vertex. but it only uses 2 bones per vertext
    skinWeights.push(1 - skinWeight, skinWeight, 0, 0);//set the skin weights. the impact of the bone.
}

//now to attach above attribuutes to our geometry
pageGeometry.setAttribute(
    "skinIndex",
    new Uint16BufferAttribute(skinIndexes, 4)//4 bones that will have an impact on our verticies
);
pageGeometry.setAttribute(
    "skinWeight",
    new Float32BufferAttribute(skinWeights, 4)//same as above but for weight. is a float32 because the number is between 0-1
);

//page materials. 6 materials because the book's geometry has 6 faces. one material per face


const pageMaterials = [
    new MeshStandardMaterial({
        color: "fff",
    }),
    new MeshStandardMaterial({
        color: "#111",
    }),
    new MeshStandardMaterial({
        color: "fff",
    }),
    new MeshStandardMaterial({
        color: "fff",
    }),
]

//preload all pages
pages.forEach((page) => {
    useTexture.preload(`/images/${page.front}.png`);
    useTexture.preload(`/images/${page.back}.png`);
});


//can make this page a seperate component
const Page = ({number, front, back, page, opened, bookClosed, ...props}) => {
    //create texture of front and back photos
    const [picture, picture2, pictureRoughness] = useTexture([
        `/images/${front}.png`,
        `/images/${back}.png`,
    ]);
    picture.colorSpace = picture2.colorSpace = SRGBColorSpace;

    const group = useRef();

    const skinnedMeshRef = useRef();

    //making our mesh and bones
    const manualSkinnedMesh= useMemo(() => {
        const bones =[];
        for (let i = 0; i <= PAGE_SEGMENTS; i++) {
            let bone = new Bone();
            bones.push(bone);
            if (i === 0) {
                bone.position.x = 0;
            }else {
                bone.position.x = SEGMENT_WIDTH;
            }
            if (i > 0) {
                bones[i - 1].add(bone); //attach new bone to previous bone
            }
        }
        const skeleton = new Skeleton(bones);

        //skinned mesh
        const materials = [...pageMaterials,
            new MeshStandardMaterial({
                map: picture, //if number is 0 we'll create a visual effect with the lights. closer to 1 makes more matte effect.
                ...(number === 0 ? {
                    roughnessMap: pictureRoughness,
                } : {
                    roughness: 0.1,
                }),
                }),
                new MeshStandardMaterial
        ];
        const mesh = new SkinnedMesh(pageGeometry, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false; //if we're close to it when we bend it we can still see our book
        mesh.add(skeleton.bones[0]); //add root bone to our mesh
        mesh.bind(skeleton); //bind skeleton to skin mesh
        return mesh;
    }, []);

    //this shows us the bones, not neccessary unless you want visual conformation
    //useHelper(skinnedMeshRef, SkeletonHelper, "red");

    useFrame((_, delta) => {
        if (!skinnedMeshRef.current) {
            return;
        }

        let targetRotation = opened ? -Math.PI / 2 : Math.PI / 2;
        if (!bookClosed) { //this if statement removes the space inbetween when closed
        targetRotation += degToRad(number * 0.8); //this fixes the one page never changing issue for some reason, but it also gives space to pages inbetween.
        }

        const bones = skinnedMeshRef.current.skeleton.bones;
        //bones[0].rotation.y = MathUtils.lerp(bones[0].rotation.y, targetRotation, lerpFactor); //this is before messing with bones and will open normally
        //looping through each bone applying a rotation to make the ideal curve.
        for (let i = 0; i < bones.length; i++) {
            const target = i === 0 ? group.current : bones[i]; //our target won't be a bone but the group below in the return (container of our page) because we are changing the z position of our page and rotate the parent before apply rotation z then all the bones.
        
            //applying the right curve is very math heavy. use graphtoy.com for help. but we need to make a variable for the intensity we want and that's what this is using math.
            const insideCurveIntensity = i < 8 ? Math.sin(i * 0.2 + 0.25) : 0;
            const outsideCurveIntensity = i >= 8 ? Math.cos(i * 0.3 + 0.09) : 0;
            let rotationAngle =
                insideCurveStrength * insideCurveIntensity * targetRotation -
                outsideCurveStrength * outsideCurveIntensity * targetRotation;
            if (bookClosed) {
                if (i === 0) {
                    rotationAngle = targetRotation;
                }else {
                    rotationAngle = 0;
                }
            }

            easing.dampAngle(
                target.rotation, 
                "y", //the key
                rotationAngle,  
                easingFactor, 
                delta
            );
        };
    });

    return (
        <group {...props} ref={group}>
            <primitive 
                object={manualSkinnedMesh} 
                ref={skinnedMeshRef}
                //position-z={-number * PAGE_DEPTH + page * PAGE_DEPTH} //this made everything funky. probably best not to use.
               />

            {/* //we're using skinnedMesh instead of mesh because it has a skeleton that can be used to animate vertices of the geometry. so we delete the below that was just to get an object on screen and replace it with what's above.
            <mesh scale={1}>
                <primitive object={pageGeometry} attach={"geometry"}/>
                <meshBasicMaterial color="red"/>
            </mesh> */}
        </group>
    )
}


export const Book = ({...props}) => {
    const [page] = useAtom(pageAtom) //connects to the UI component so we more to page when clicked
    return(
        <group {...props} rotation-y={-Math.PI / 2}>
        {[...pages].map((pageData, index) => (
                    <Page
                        //position-x={index * 0.15} //removed to not have all the pages popping out
                        key={index}
                        page= {page} //need to know what page we're on
                        number={index}
                        opened={page > index}
                        bookClosed={page === 0 || page === pages.length}
                        {...pageData}
                    />
        ))}
        </group>
    );
};