function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
}

function sortGrades(a, b) {
  if(a < b) {
    return -1;
  }
  if(a > b) {
    return 1;
  }
  return 0;
}