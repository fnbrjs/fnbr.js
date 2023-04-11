/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
const fs = require('fs').promises;
const path = require('path');

const recursiveReaddir = async (folder) => {
  const resolvedFiles = [];

  const files = await fs.readdir(folder);

  for (const file of files) {
    const filePath = path.join(folder, file);
    const stat = await fs.stat(filePath);

    if (stat.isDirectory()) {
      resolvedFiles.push(...await recursiveReaddir(`${folder}/${file}`));
    } else {
      resolvedFiles.push(`${folder}/${file}`);
    }
  }

  return resolvedFiles;
};

(async () => {
  let output = '';

  output += '// main exports\nexport { default as Client } from \'./src/Client\';\n'
  + 'export { default as Enums } from \'./enums/Enums\';\n\n// types and interfaces\nexport * from \'./resources/structs\';\n'
  + '\n// endpoints\nexport { default as Endpoints } from \'./resources/Endpoints\';\n';

  output += '\n// exceptions\n';
  const exceptions = await recursiveReaddir('./src/exceptions');
  exceptions.sort();
  exceptions.forEach((file) => {
    const fileWithoutExtension = file.split('/').pop().split('.')[0];
    const filePathWithoutExtension = file.split('.').slice(0, -1).join('.');
    output += `export { default as ${fileWithoutExtension} } from '${filePathWithoutExtension}';\n`;
  });

  output += '\n// structures\n';
  const structures = await recursiveReaddir('./src/structures');
  structures.sort();
  structures.forEach((file) => {
    const fileWithoutExtension = file.split('/').pop().split('.')[0];
    const filePathWithoutExtension = file.split('.').slice(0, -1).join('.');
    output += `export { default as ${fileWithoutExtension} } from '${filePathWithoutExtension}';\n`;
  });

  await fs.writeFile('./index.ts', output);
})();
