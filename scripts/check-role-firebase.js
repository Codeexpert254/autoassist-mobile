#!/usr/bin/env node
// Validate Firebase clients BEFORE paying for multiple lengthy Gradle builds.
// A flavor's package ID must match a client entry in its google-services.json.
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const cfg=require("../app.config.js")({config:require("../app.json").expo});
const packageBase=cfg.android.package;
const flavors=[
  ["motorist",".test.motorist"],["mechanic",".test.mechanic"],
  ["dealer",".test.dealer"],["towing",".test.towing"],["rider",".test.rider"],
];
let failed=0;
for(const [flavor,suffix] of flavors){
  const pkg=packageBase+suffix;
  const locations=[
    path.join(root,"firebase-test",flavor,"google-services.json"),
    path.join(root,"android","app","src",flavor,"google-services.json"),
    path.join(root,"android","app","google-services.json"),
    path.join(root,"google-services.json"),
  ];
  let valid=false,seen=false;
  for(const filepath of locations){
    if(!fs.existsSync(filepath))continue;
    seen=true;
    try{
      const data=JSON.parse(fs.readFileSync(filepath,"utf8"));
      if((data.client??[]).some(client=>
        client.client_info?.android_client_info?.package_name===pkg)){
        console.log("OK     "+flavor.padEnd(9)+pkg+" ("+path.relative(root,filepath)+")");
        valid=true;break;
      }
    }catch{
      console.error("INVALID JSON: "+path.relative(root,filepath));
    }
  }
  if(!valid){
    failed++;
    console.error("MISSING "+flavor.padEnd(9)+pkg+(seen?" (no matching Firebase client)":" (no Firebase config)"));
  }
}
if(failed){
  console.error("\nRegister these unique application IDs as Android apps in the SAME Firebase project.");
  console.error("Download each app's google-services.json to firebase-test/<flavor>/google-services.json.");
  console.error("Then run npx expo prebuild --platform android --clean after backing up android.");
  process.exitCode=1;
}else{
  console.log("\nAll five test roles have matching Firebase configurations.");
}
