var ALL_GRADES = ['4A', '4B', '4C', '5A', '5A+', '5B', '5B+', '5C', '5C+', '6A', '6A+', '6B', '6B+', '6C', '6C+', '7A', '7A+', '7B', '7B+', '7C', '7C+', '8A'];
var PYRAMID_SHAPE = [8, 4, 2, 1];

function buildThePyramids() {
  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  // Récupère toutes les pages de grimpeurs (ie. qui commence par *)
  var personalSheets = sheets.filter(function (sheet) { return sheet.getName().indexOf('*') === 0 });

  return personalSheets.reduce(constructPyramid, []);
}

function constructPyramid(result, sheet, index) {
  // Nom du grimpeur

  var sheetName = sheet.getName();
  result.push([sheetName.substr(1)]);

  // liste de toutes les voies grimpées
  var lastClimb = sheet.getLastRow();
  var climbsGrades = sheet.getRange(2, 2, lastClimb - 1).getValues()
    .map(function (grade) { return grade[0]; })
    .filter(function(grade) { return grade.length; });
  //triée par difficultés
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
  Object.keys(gradesAndDraw).map(function(grade) { result.push(gradesAndDraw[grade]); });

  // Pyramide pour 1 grimpeur + padding
  result.push([]);
  return result;
}

/***********SUB ROUTINES*************/

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