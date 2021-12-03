var ALL_GRADES = ['4A', '4B', '4C', '5A', '5A+', '5B', '5B+', '5C', '5C+', '6A', '6A+', '6B', '6B+', '6C', '6C+', '7A', '7A+', '7B', '7B+', '7C', '7C+', '8A'];
var PYRAMID_SHAPE = [8, 4, 2, 1];

function buildThePyramids() {
  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  // Récupère toutes les pages de grimpeurs (ie. qui commence par *)
  var personalSheets = sheets.filter(function (sheet) { return sheet.getName().indexOf('*') === 0 });

  return personalSheets.reduce(constructPyramid, 1);
}

function constructPyramid(line, sheet, index) {
  // Nom du grimpeur

  var sheetName = sheet.getName();

  // liste de toutes les voies grimpées
  var lastClimb = sheet.getLastRow();
  var climbsGrades = sheet.getRange(2, 2, lastClimb - 1).getValues()
    .map(function (grade) { return grade[0]; })
    .filter(function(grade) { return grade.length; });
  //triées par difficultés
  climbsGrades.sort(sortGrades);
 
  // liste de toutes les cotations grimpées
  var grades = climbsGrades.filter(onlyUnique);

  // Compteur des voies par cotation
  var gradesAndCount = grades.reduce(countSameGrades.bind(this, climbsGrades), {});
  
  // Cotations de la pyramide
  // Si une pyramide est déjà validée on augmente la note de base de la pyramide
  var baseGradeIndex = findBaseIndex(gradesAndCount, ALL_GRADES.indexOf(grades[0]));
  var projectGradeIndex = baseGradeIndex + 4;
  var maxGradeIndex = ALL_GRADES.indexOf(grades[grades.length - 1]);

  var pyramidGrades = ALL_GRADES.slice(baseGradeIndex, projectGradeIndex);
 
  // Crée les lignes de la pyramide
  var gradesAndDraw = ALL_GRADES.reduce(checkDoneGrades.bind(this, gradesAndCount, pyramidGrades), {});
  
  // Merger dans result
  const result = Object.keys(gradesAndDraw).reduce((array, grade) => [...array, gradesAndDraw[grade]], []);
  // On cherche la ligne la plus longue pour que ca soit bien plein pour la range
  const longestLine = result.reduce((longest, line) => line.length > longest ? line.length : longest, 0);

  const paddedResult = padArray(result, longestLine);

  // Ajout du nom du grimpeur
  paddedResult.unshift([sheetName.substr(1), ...new Array(longestLine - 1)]);
  // paddedResult.push(new Array(longestLine));

  // Transforme le tableau en range sheet pour appliquer du formatting
  const range = applyArrayToRange(line, longestLine, paddedResult);

  // Ajoute les couleurs
  setStyle(range);

  // Ajoute le collapse
  setGroup(range);

  // Renvoi la première ligne a partir d'où construire la pyramide suivante (On laisse une ligne vide)
  return line  + result.length + 2;
}

/***********SUB ROUTINES*************/
function setGroup(range) {
  const collapsableRange = range.offset(1, 0, range.getHeight() - 1, range.getWidth());
  const a1 = collapsableRange.getA1Notation();
  collapsableRange.shiftRowGroupDepth(-2);
  collapsableRange.shiftRowGroupDepth(1);
}

function padArray(array, longestLine) {
  // Pad avec des - jusqu'à max grade pour la colorisation
  return array.map(line => {
    const paddedLine = [...line, ...new Array(longestLine - line.length).fill('')];

    // Le premier élément est la cotation elle même, on ne veux colorer que les ticks
    return paddedLine.fill('-', line.length, PYRAMID_SHAPE[0] + 1);
  });
}

function setStyle(range) {
  // Reset les styles avant de réappliquer
  range.setFontColor('black');
  range.setBackground('white');
  range.setBorder(false, false, false, false, false, false);

  // Bordure pour le nom
  const nameCell = range.getCell(1,1);
  nameCell.setBorder(true, true, true, true, false, false);
  nameCell.setFontWeight('bold');

  // Bordure pour la pyramide (sans encadrer ce qui dépasse des 8)
  const pyramidRange = range.offset(1, 0, range.getHeight() - 1, 9);
  pyramidRange.setBorder(true, true, true, true, true, true);

  // Couleurs pour les ticks
  const finderCross = range.createTextFinder('✖');
  finderCross.findAll().forEach(cell => cell.setFontColor('#CD5C5C'));
  const finderCheck = range.createTextFinder('✓');
  finderCheck.findAll().forEach(cell => cell.setFontColor('#228B22'));
  const finderEmpty = range.createTextFinder('-');
  finderEmpty.findAll().forEach(cell => { cell.setBackground('#D3D3D3'); cell.setFontColor('#D3D3D3'); });
}

function applyArrayToRange(lineNumber, columnNumber, linesArray) {
  const columnLetter = String.fromCharCode(64 + columnNumber)
  const lastLine = lineNumber + linesArray.length - 1;
  const rangeString = `A${lineNumber}:${columnLetter}${lastLine}`;

  var range = SpreadsheetApp.getActiveSpreadsheet().getRange(rangeString);
  range.setValues(linesArray);
  return range;
}

function countSameGrades(climbsGrades, acc, grade) {
  acc[grade] = climbsGrades.filter(function (g) { return g === grade; }).length;
  return acc;
}

function checkDoneGrades(gradesAndCount, pyramidGrades, gradesLines, grade) {
  var pyramidLevel = pyramidGrades.indexOf(grade);
  var crossArray = [];
  // Si la cotation a été grimpée ou est dans la pyramide, on l'ajoute a l'affichage
  if(gradesAndCount[grade] || pyramidLevel !== -1) {
    // Commencer la ligne avec la cotation
    // TODO: colorer si c'est validé
    crossArray.push(grade);
   
    // Cocher les routes validées dans la cotation
    for(var i = 0; i < gradesAndCount[grade]; i++) {
      crossArray.push('✓');
    }
    
   // Remplir du bon nombre de ✖ si c'est dans la pyramide
   if(pyramidLevel !== -1) {
     var numberOfTicks = (crossArray.length - 1);
     var toFill = PYRAMID_SHAPE[pyramidLevel] - numberOfTicks;
     for(var i = 0; i < toFill; i++) {
       crossArray.push('✖');
     }
   }
   
   gradesLines[grade] = crossArray;
  }

  return gradesLines;
}

function findBaseIndex(gradesAndCount, indexOfGrade) {
  // Si une pyramide a déjà été validée, on avance a la pyramide suivante
  if(PYRAMID_SHAPE.every(gradeValidated.bind(this, gradesAndCount, indexOfGrade))) {
    return findBaseIndex(gradesAndCount, indexOfGrade + 1);
  }
  
  return indexOfGrade;
}

function gradeValidated(gradesAndCounts, index, pyramidNumber, pyramidLevel) {
  return gradesAndCounts[ALL_GRADES[index + pyramidLevel]] >= pyramidNumber;
}