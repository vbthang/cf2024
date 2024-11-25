const args = process.argv.slice(2);

switch (args[0]) {
  case '1':
  case '2':
    console.log('Case 2');
    break;
  case '3':
  default:
    console.log('Default');
    break;
}
