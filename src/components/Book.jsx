import { useMemo, useRef } from "react"
import { pages } from "./UI"
import { Bone, BoxGeometry, Float32BufferAttribute, MeshStandardMaterial, Skeleton, SkeletonHelper, SkinnedMesh, Uint16BufferAttribute, Vector3 } from "three";
import { useHelper } from '@react-three/drei';

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
        color: "#fff",
    }),
    new MeshStandardMaterial({
        color: "#111",
    }),
    new MeshStandardMaterial({
        color: "#fff",
    }),
    new MeshStandardMaterial({
        color: "#fff",
    }),
    new MeshStandardMaterial({
        color: "pink",
    }),
    new MeshStandardMaterial({
        color: "blue",
    }),
]



const Page = ({number, front, back, ...props}) => {
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
        const materials = pageMaterials;
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

    useFrame(() => {
        if (!skinnedMeshRef.current) {
            return;
        }

        const bones = skinnedMeshRef.current.skeleton.bones;

        bones[2].rotation.y = degToRad(40);
        bones[4].rotation.y = degToRad(-40);

    });

    return (
        <group {...props} ref={group}>
            <primitive object={manualSkinnedMesh} ref={skinnedMeshRef}/>

            {/* //we're using skinnedMesh instead of mesh because it has a skeleton that can be used to animate vertices of the geometry. so we delete the below that was just to get an object on screen and replace it with what's above.
            <mesh scale={1}>
                <primitive object={pageGeometry} attach={"geometry"}/>
                <meshBasicMaterial color="red"/>
            </mesh> */}
        </group>
    )
}


export const Book = ({...props}) => {
    return(
        <group {...props}>
        {
            [...pages].map((pageData, index) => (
                (index === 0 ? (
                    <Page
                        position-x={index * 0.15}
                        key={index}
                        number={index}
                        {...pageData}
                    />
                ) : null)
            ))
        }
    </group>
);
};