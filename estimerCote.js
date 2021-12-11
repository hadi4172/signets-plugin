let informationsCotes = [
    { lettre: "A+", nombre: 4.3, noteEstimee: 90, rangCentileEstime: 87 },
    { lettre: "A-", nombre: 3.7, noteEstimee: 80, rangCentileEstime: 69 },
    { lettre: "A", nombre: 4, noteEstimee: 85, rangCentileEstime: 78 },
    { lettre: "B+", nombre: 3.3, noteEstimee: 76, rangCentileEstime: 59 },
    { lettre: "B-", nombre: 2.7, noteEstimee: 69, rangCentileEstime: 40 },
    { lettre: "B", nombre: 3, noteEstimee: 72, rangCentileEstime: 49 },
    { lettre: "C+", nombre: 2.3, noteEstimee: 66.5, rangCentileEstime: 33 },
    { lettre: "C-", nombre: 1.7, noteEstimee: 60, rangCentileEstime: 15 },
    { lettre: "C", nombre: 2, noteEstimee: 63, rangCentileEstime: 24 },
    { lettre: "D+", nombre: 1.3, noteEstimee: 57, rangCentileEstime: 6 },
    { lettre: "D", nombre: 1, noteEstimee: 50, rangCentileEstime: 2 },
    { lettre: "E", nombre: 0, noteEstimee: 0, rangCentileEstime: 0 }
];

window.onload = () => {
    document.querySelector("#btn-calc").addEventListener("click", function () {
        insererPredictionCote();
    });
}

const insererPredictionCote = () => {
        let cotesOrdonnees = informationsCotes.slice(0).sort((a, b) => a.nombre - b.nombre);
        let note = parseInt(document.querySelector("#input-note").value);
        let valRangCentileTotal = parseInt(document.querySelector("#input-rc").value);
        let nombreCalcule = 0;
        let cotePredite = "";

        if (note < 50) cotePredite = "E";
        else {
            for (let i = 0, length = cotesOrdonnees.length; i < length; i++) {
                if (i === length - 1 || cotesOrdonnees[i + 1].noteEstimee > note) {
                    nombreCalcule += cotesOrdonnees[i].nombre;
                    break;
                }
            }
            for (let i = 0, length = cotesOrdonnees.length; i < length; i++) {
                if (i === length - 1 || cotesOrdonnees[i + 1].rangCentileEstime > valRangCentileTotal) {
                    nombreCalcule += cotesOrdonnees[i].nombre;
                    break;
                }
            }
            nombreCalcule /= 2;

            for (let i = 0, length = cotesOrdonnees.length; i < length; i++) {
                if (i === length - 1 || cotesOrdonnees[i + 1].nombre > nombreCalcule) {
                    cotePredite = cotesOrdonnees[(i === length - 1) ? i : (i + 1)].lettre;
                    if (cotePredite === "A+") cotePredite = "A ou A+";
                    else if (cotePredite === "E") cotePredite = "E ou D";
                    else cotePredite = cotesOrdonnees[i].lettre + ", " + cotePredite + " ou " + cotesOrdonnees[i + 2].lettre;
                    break;
                }
            }
        }
        document.querySelector("#resultat-cote").innerHTML = "Prédiction : " + cotePredite;
    }
