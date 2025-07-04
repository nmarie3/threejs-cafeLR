import { useEffect, useMemo, useRef, useState } from "react"
import { pageAtom, pages } from "./UI"
import { Bone, BoxGeometry, Float32BufferAttribute, MeshBasicMaterial, Skeleton, SkeletonHelper, SkinnedMesh, SRGBColorSpace, Uint16BufferAttribute, Vector3 } from "three";
import { useCursor, useHelper, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { degToRad } from 'three/src/math/MathUtils';
import { useAtom } from "jotai";
import { easing } from "maath";

//const lerpFactor = 0.05; //controls the speed of interpolation until we replace with easing
const easingFactor = 0.5; //controls the speed of the easing.
const easingFactorFold = 0.3; //controls the speed of the easing.
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
    new MeshBasicMaterial({
        color: "fff",
    }),
    new MeshBasicMaterial({
        color: "#C49E97",
    }),
    new MeshBasicMaterial({
        color: "fff",
    }),
    new MeshBasicMaterial({
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
    const [picture, picture2] = useTexture([
        `/images/${front}.png`,
        `/images/${back}.png`,
    ]);
    picture.colorSpace = picture2.colorSpace = SRGBColorSpace;
  
    const group = useRef();
    const turnedAt = useRef(0); //save the date when we change twhether its open or not on specfic page.
    const lastOpened = useRef(opened); //to check if the last frame was open or not and that's how we know about the changed date above.

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
            new MeshBasicMaterial({
                color: "#fff",
                map: picture, //if number is 0 we'll create a visual effect with the lights. closer to 1 makes more matte effect.
                roughness: 0.1,
                }),
            new MeshBasicMaterial ({ //this is so another image appears on the back side when flipped
                color: "#fff",
                map: picture2,
                roughness: 0.1,
                })
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

        if (lastOpened.current !== opened) { //if the value between open and last is differnt it means we just chnaged it so we can then...
            turnedAt.current = +new Date(); //save it it as a new Date. the "+" gets the timestamp value.
            lastOpened.current = opened; //and then we store the last value date here.
        }
        //then to have this effect last 400 miliseconds...
        let turningTime = Math.min(400, new Date() - turnedAt.current) / 400; //by dividing it by 400 we get a value between 0 and 1 and it will mean we are either starting the transition or not.
        //the following math equation is for it to open halfway between 0 and 1, and when it then falls to 1 on the curve, it will turn to 0 again.
        turningTime = Math.sin(turningTime * Math.PI);


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
            const turningIntensity = Math.sin(i * Math.PI * (1 / bones.length)) * turningTime; //the inbetween turning of pages. bends inside before going back to normal position.
            let rotationAngle =
                insideCurveStrength * insideCurveIntensity * targetRotation -
                outsideCurveStrength * outsideCurveIntensity * targetRotation +
                turningCurveStrength * turningIntensity * targetRotation;
                //now to bend on the x-axis too while the page is turning.
                let foldRotationAngle = degToRad(Math.sign(targetRotation) * 2); //it will be equal to 1 or -1. because Math.sign returns -1 if targetRotation is below 0 and 1 if it's over. so basically, if the book is open or not.
            if (bookClosed) {
                if (i === 0) {
                    rotationAngle = targetRotation;
                }else {
                    rotationAngle = 0;
                    foldRotationAngle = 0; //book is closed.
                }
            }

            easing.dampAngle(
                target.rotation, 
                "y", //the key
                rotationAngle,  
                easingFactor, 
                delta
            );

            //when the bone is over 8 it creates this intensity.
            const foldIntensity = i > 8 ? Math.sin(i * Math.PI * (1 / bones.length) - 0.5) * turningTime : 0;
            easing.dampAngle(
                target.rotation,
                "x",
                foldRotationAngle * foldIntensity,
                easingFactorFold,
                delta
            );
        };
    });

    const [_, setPage] = useAtom(pageAtom);
    const [highlighted, setHighlighted] = useState(false);
    useCursor(highlighted); //turns cursor to pointer when highlighted value is true.

    return (
        <group {...props} ref={group}
        //adding events so we can turn pages on hover and click
        onPointerEnter={(e) => {
            e.stopPropagation();//this is needed so it only does it one the one we hover and not impact all the pages.
            setHighlighted(true);
        }}
        onPointerLeave={(e) => {
            e.stopPropagation();
            setHighlighted(false);
        }}
        onClick={(e) => {
            e.stopPropagation();
            setPage(opened ? number : number +1);
            setHighlighted(false);
        }}
        >
            <primitive 
                object={manualSkinnedMesh} 
                ref={skinnedMeshRef}
                position-z={-number * PAGE_DEPTH + page * PAGE_DEPTH} //stops it from all the pages fighting for visablity
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
    //add delayedPage logic so it stops turning all pages at once and gives it more of a flip feel when moving between multiple pages.
    const [delayedPage, setDelayedPage] = useState(page);

    useEffect(() => {
        let timeout;
        const goToPage = () => {
            setDelayedPage((delayedPage) => {
                if (page === delayedPage) {
                    return delayedPage; //if equal just return because we didnt't turn page.
                }else {
                    timeout = setTimeout(() => {
                        goToPage();
                        },
                    Math.abs(page - delayedPage) > 2 ? 50 : 150 //if we have more that 2 pages, do it quickly of 50 milisec, otherwise slower at 150 milisecs.
                    ); 
                    //these below is what does the page by page flip instead of all at once while deciding if speed is 50 or 150. basically the 150 makes it slow down when it reaches the page you want.
                    if (page > delayedPage) {
                        return delayedPage + 1;
                    }
                    if (page < delayedPage) {
                        return delayedPage - 1;
                    }
                }
            })
        }
        goToPage();
        return () => {
            clearTimeout(timeout);
        };
    }, [page]);

    return(
        <group {...props} rotation-y={-Math.PI / 2}>
        {[...pages].map((pageData, index) => (
                    <Page
                        //position-x={index * 0.15} //removed to not have all the pages popping out
                        key={index}
                        page= {delayedPage} //need to know what page we're on. *was originally "page" but changed to "delayedPage" after setting that up.
                        number={index}
                        opened={delayedPage > index} //*originally "page", change for same reason as above.
                        bookClosed={delayedPage === 0 || delayedPage === pages.length} //*same as above with page.
                        {...pageData}
                    />
        ))}
        </group>
    );
};