import { Web3Storage } from 'web3.storage';


// Construct with token and endpoint
const apiToken = process.env.API_TOKEN || 
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDM5MmRkMUFBYTA3ZGZiMkJBZTc3NDBGMDU5MTQyZUU0ZUMyQjg2N0MiLCJpc3MiOiJ3ZWIzLXN0b3JhZ2UiLCJpYXQiOjE2NDczNzQ2Mzc5MDMsIm5hbWUiOiJyZWZ1bmQifQ.IsuMJU8bXBkfDLBVMfOMV405cKqr2GmINuIfRq82RWE";
if (!apiToken) {
  console.error('A token is needed. You can create one on https://web3.storage')
}
console.log("APITOKEN: ", apiToken);
const client = new Web3Storage({ token: apiToken });



// export async function storeImage(imageFile, caption) {
//   // The name for our upload includes a prefix we can use to identify our files later
//   const uploadName = [namePrefix, caption].join('|')

//   // We store some metadata about the image alongside the image file.
//   // The metadata includes the file path, which we can use to generate 
//   // a URL to the full image.
//   const metadataFile = jsonFile('metadata.json', {
//     path: imageFile.name,
//     caption
//   })

//   const token = getSavedToken()
//   if (!token) {
//     showMessage('> ❗️ no API token found for Web3.Storage. You can add one in the settings page!')
//     showLink(`${location.protocol}//${location.host}/settings.html`)
//     return
//   }
//   const web3storage = new Web3Storage({ token })
//   showMessage(`> 🤖 calculating content ID for ${imageFile.name}`)
//   const cid = await web3storage.put([imageFile, metadataFile], {
//     // the name is viewable at https://web3.storage/files and is included in the status and list API responses
//     name: uploadName,

//     // onRootCidReady will be called as soon as we've calculated the Content ID locally, before uploading
//     onRootCidReady: (localCid) => {
//       showMessage(`> 🔑 locally calculated Content ID: ${localCid} `)
//       showMessage('> 📡 sending files to web3.storage ')
//     },

//     // onStoredChunk is called after each chunk of data is uploaded
//     onStoredChunk: (bytes) => showMessage(`> 🛰 sent ${bytes.toLocaleString()} bytes to web3.storage`)
//   })

//   const metadataGatewayURL = makeGatewayURL(cid, 'metadata.json')
//   const imageGatewayURL = makeGatewayURL(cid, imageFile.name)
//   const imageURI = `ipfs://${cid}/${imageFile.name}`
//   const metadataURI = `ipfs://${cid}/metadata.json`
//   return { cid, metadataGatewayURL, imageGatewayURL, imageURI, metadataURI }
// }

export async function addToIPFS(file) {
  const rootCid = await client.put(file, { maxRetries: 3 })
  return rootCid;
}

export function urlFromCID(cid) {
  return `https://dweb.link/ipfs/${cid}/`;
}

export async function retrieveFile(cid) {
  const res = await client.get(cid)
  console.log(`Got a response! [${res.status}] ${res.statusText}`)
  if (!res.ok) {
    throw new Error(`failed to get ${cid} - [${res.status}] ${res.statusText}`)
  }

  // unpack File objects from the response
  const files = await res.files()
  console.log(files);
  if (files.length > 0) {
    console.log("fileName", files[0].name);
    const path = `https://dweb.link/ipfs/${cid}/${files[0].name}`;
    console.log("path", path)
    return `https://dweb.link/ipfs/${cid}/${files[0].name}`;
  } 
  return urlFromCID(cid);
}
