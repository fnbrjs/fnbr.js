const fs = require('fs').promises;

(async () => {
  let output = '';

  output += '// main exports\nexport { default as Client } from \'./src/client/Client\';\n'
  + 'export { default as Enums } from \'./enums/Enums\';\n\n// types and interfaces\nexport * from \'./resources/structs\';\n'
  + '\n// endpoints\nexport { default as Endpoints } from \'./resources/Endpoints\';\n';

  output += '\n// exceptions\n';
  const exceptions = await fs.readdir('./src/exceptions');
  exceptions.forEach((file) => {
    const fileWithoutExtension = file.split('.')[0];
    output += `export { default as ${fileWithoutExtension} } from './src/exceptions/${fileWithoutExtension}';\n`;
  });

  output += '\n// structures\n';
  const structures = await fs.readdir('./src/structures');
  structures.forEach((file) => {
    const fileWithoutExtension = file.split('.')[0];
    output += `export { default as ${fileWithoutExtension} } from './src/structures/${fileWithoutExtension}';\n`;
  });

  await fs.writeFile('./index.ts', output);
})();
