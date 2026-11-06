const fs = require("node:fs");
const path = require("node:path");
const { withAppBuildGradle, withDangerousMod } = require("expo/config-plugins");

// Six flavors total: the original main package + five independent test apps.
// Keep the base package unchanged so the installed main AutoAssist is preserved.
const FLAVORS = [
  { id:"mainapp", suffix:"", label:"AutoAssist" },
  { id:"motorist", suffix:".test.motorist", label:"AutoAssist Motorist" },
  { id:"mechanic", suffix:".test.mechanic", label:"AutoAssist Mechanic" },
  { id:"dealer", suffix:".test.dealer", label:"AutoAssist Dealer" },
  { id:"towing", suffix:".test.towing", label:"AutoAssist Towing" },
  { id:"rider", suffix:".test.rider", label:"AutoAssist Rider" },
];
const START="// AUTOASSIST_TEST_FLAVORS_START";
const END="// AUTOASSIST_TEST_FLAVORS_END";

module.exports = function withAutoAssistTestFlavors(config) {
  const basePackage = config.android?.package;
  if (!basePackage || !/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(basePackage)) {
    throw new Error("AutoAssist test flavors need a valid expo.android.package");
  }

  config = withAppBuildGradle(config, config => {
    if (config.modResults.language !== "groovy") {
      throw new Error("AutoAssist test flavors currently support Groovy app/build.gradle");
    }
    let source = config.modResults.contents;
    const existingStart = source.indexOf(START);
    const existingEnd = source.indexOf(END);
    if (existingStart >= 0 && existingEnd >= existingStart) {
      source = source.slice(0,existingStart)+source.slice(existingEnd+END.length);
    }
    const androidBlock = /\bandroid\s*\{/;
    if (!androidBlock.test(source)) throw new Error("Cannot find Android Gradle configuration");
    const groovyQuoted = value => "'"+value.replace(/\\/g,"\\\\").replace(/'/g,"\\'")+"'";
    const additions = FLAVORS.map(f=>`        ${f.id} {
            dimension "autoassistRole"
            applicationId ${groovyQuoted(basePackage+f.suffix)}
        }`).join("\n");
    const block=`\n    ${START}
    flavorDimensions "autoassistRole"
    productFlavors {
${additions}
    }
    ${END}
`;
    config.modResults.contents=source.replace(androidBlock,match=>match+block);
    return config;
  });

  config = withDangerousMod(config,["android",config=>{
    const nativeRoot=config.modRequest.platformProjectRoot;
    for(const flavor of FLAVORS){
      const folder=path.join(nativeRoot,"app","src",flavor.id,"res","values");
      fs.mkdirSync(folder,{recursive:true});
      const escaped=flavor.label.replace(/&/g,"&amp;").replace(/</g,"&lt;");
      fs.writeFileSync(path.join(folder,"strings.xml"),
        `<resources><string name="app_name">${escaped}</string></resources>\n`);
    }
    return config;
  }]);
  return config;
};
