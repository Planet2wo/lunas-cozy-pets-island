// Copies three.js r128 (installed by npm) into public/vendor so the game runs offline and never depends on a CDN.
// Runs automatically after `npm install` (see "postinstall" in package.json). If anything is missing, the game
// simply falls back to loading three.js from the CDN, so this step can never break the game.
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),src=path.join(root,'node_modules','three'),out=path.join(root,'public','vendor');
try{
  fs.mkdirSync(out,{recursive:true});
  fs.copyFileSync(path.join(src,'build','three.min.js'),path.join(out,'three.min.js'));
  const ex=['shaders/CopyShader.js','shaders/LuminosityHighPassShader.js','postprocessing/EffectComposer.js',
    'postprocessing/RenderPass.js','postprocessing/ShaderPass.js','postprocessing/UnrealBloomPass.js'];
  fs.writeFileSync(path.join(out,'three-postfx.js'),ex.map(f=>fs.readFileSync(path.join(src,'examples','js',f),'utf8')).join('\n;\n'));
  console.log('three.js r128 copied to public/vendor (offline ready)');
}catch(e){console.warn('Could not copy three.js into public/vendor; the game will load it from the CDN instead.',e.message);}
