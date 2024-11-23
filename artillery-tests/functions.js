// functions.js

module.exports = {
  generateFormData,
};

function generateFormData(context, events, done) {
  console.log('Generating form data for user:', context.vars.username);

  const formData = {
    id_user: context.vars.username, // Use context.vars.id_user if you have id_user in your CSV
    id_tipe_lantai: getRandomInt(1, 5), // Adjust ranges to match your database IDs
    id_kondisi: getRandomInt(1, 3),
    catatan: "Test catatan",
    clientTimestamp: new Date().toISOString(),
    foto: context.vars.imagePath,
  };

  // Randomly select one of the asset types
  const assetTypes = ['aset', 'hb', 'door'];
  const selectedType = assetTypes[getRandomInt(0, assetTypes.length - 1)];

  // Initialize asset type fields
  formData.id_tipe_aset = '';
  formData.id_tipe_hb = '';
  formData.id_tipe_door = '';

  // Assign a random ID to the selected asset type
  switch (selectedType) {
    case 'aset':
      formData.id_tipe_aset = getRandomInt(1, 10); // Adjust range as per your data
      break;
    case 'hb':
      formData.id_tipe_hb = getRandomInt(1, 5);
      break;
    case 'door':
      formData.id_tipe_door = getRandomInt(1, 5);
      break;
  }

  context.vars.formData = formData;
  return done();
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

