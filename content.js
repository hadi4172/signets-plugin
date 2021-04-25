window.onload = () => {
    // =========================================================================
    // Interface notes
    // =========================================================================
    if (window.location.href.includes(`signets-ens.etsmtl.ca/Secure/DetailsCoursGroupe`)) {
        gererPageNotes();

        // =====================================================================
        // Interface cours
        // =====================================================================
    } else if (["https://signets-ens.etsmtl.ca/Secure/MesNotes.aspx", "https://signets-ens.etsmtl.ca/"].includes(window.location.href)) {
        gererPageCours();
    }

    chrome.storage.sync.get('notify', function (arg) {
        if (typeof arg.notify === 'undefined') {
            setTimeout(() => {
                alert("SIGNETS Plugin est personnalisable ; cliquez sur l'icône du plugin dans votre barre de navigateur pour voir les options qui s'offrent à vous !");
                chrome.storage.sync.set({ notify: "installation" });
            }, 3000);
        }
    });
};

function getNumber(elem) { return parseFloat(vToP(elem)); }

function vToP(string) { return string.replace(/,/g, "."); }

function reformatterNote(string) { return string.replace(/ sur un maximum de /g, "/"); }
function toPercentage(numerateur, denominateur) { return numerateur / denominateur * 100; }
function getColor(note, grp, ecartType, denominateurEstValide) {
    let color;
    if (Math.floor(note) > Math.round(grp)) {
        color = "lightgreen";

        if (note > grp + ecartType)
            color = "limegreen";

    } else if (Math.ceil(note) < Math.round(grp)) {
        color = "lightpink";

        if (note + ecartType < grp)
            color = "lightcoral";

    } else if (denominateurEstValide) {
        color = "lightgoldenrodyellow";

    } else {
        color = "white";
    }
    return color;
}

function roundToXDec(num, decimals) { return Math.round((num + Number.EPSILON) * Math.pow(10, decimals)) / Math.pow(10, decimals); }
function round1dec(num) { return roundToXDec(num, 1); }
function round2dec(num) { return roundToXDec(num, 2); }

function getSum(arr) { return arr.reduce((a, b) => a + b, 0); }

function getSubstringBetween(s, a, b, last = false) {
    if (typeof s === 'undefined') return "Error"
    let p = (last ? s.lastIndexOf(a) : s.indexOf(a)) + a.length;
    let f = s.indexOf(b, p);
    if ((p - a.length === -1) || f === -1) return "Error"
    return s.substring(p, f);
}
function obtenirSommaireCours(link, asynchrone = false, callback = () => { }) {
    let resultatRequete;

    const decomposerResultat = (resultatRequete) => {
        let note = getNumber(reformatterNote(getSubstringBetween(resultatRequete, `"ctl00_ContentPlaceHolderMain_lesOnglets_tmpl0_txtTotal1">`, `&nbsp;&nbsp;</span>`)).split("/")[0]);
        let moyenne = getNumber(reformatterNote(getSubstringBetween(resultatRequete, `"ctl00_ContentPlaceHolderMain_lesOnglets_tmpl0_txtMoyenne">`, `&nbsp;&nbsp;</span>`)).split("/")[0]);
        let ecartType = getNumber(reformatterNote(getSubstringBetween(resultatRequete, `"ctl00_ContentPlaceHolderMain_lesOnglets_tmpl0_txtEcartType">`, `</span>`)).split("/")[0]);
        let maximum = getNumber(reformatterNote(getSubstringBetween(resultatRequete, `"ctl00_ContentPlaceHolderMain_lesOnglets_tmpl0_txtTotal1">`, `&nbsp;&nbsp;</span>`)).split("/")[1]);
        let rangCentile = getSubstringBetween(resultatRequete, `"ctl00_ContentPlaceHolderMain_lesOnglets_tmpl0_txtRangCentile">`, `</span>`);
        let coteFinale = getSubstringBetween(resultatRequete, `"ctl00_ContentPlaceHolderMain_lesOnglets_tmpl0_txtCoteFinale">`, `</span>`);

        let color = getColor(note, moyenne, ecartType, maximum !== 0)

        return [round1dec(toPercentage(note, maximum)), round1dec(toPercentage(moyenne, maximum)), rangCentile, color, maximum, coteFinale];
    }

    if (!asynchrone) {
        resultatRequete = getSubstringBetween(getSourceFromLink(link), `Sommaire du cours-groupe`, `Cote au dossier`);
        if (resultatRequete === "Error") return [NaN, NaN, "&nbsp;", "white", NaN, ""];
        return decomposerResultat(resultatRequete);
    } else {
        getSourceFromLinkAsync(link, (resultText) => {
            let resultatRequete = getSubstringBetween(resultText, `Sommaire du cours-groupe`, `Cote au dossier`);
            if (resultatRequete !== "Error") callback(decomposerResultat(resultatRequete));
            else callback([NaN, NaN, "&nbsp;", "white", NaN, ""]);
        });
    }

}

function getSourceFromLink(link) {
    let r = new XMLHttpRequest();

    r.open('GET', link, false);
    r.send(null);
    if (r.status == 200) {
        return minifyHTML(r.responseText);
    } else {
        return "Error";
    }
}

async function getSourceFromLinkAsync(link, callback) {
    let response = await fetch(link);
    if (response.status == 200) {
        callback(await response.text());
    }
}

function fetchInformationsCheminement() {

    //première requête GET pour obtenir les informations sur le cheminement pour un seul programme 
    //ou pour obtenir les arguments nécessaires pour lancer une requête POST et chercher les informations des autres programmes
    getSourceFromLinkAsync("https://signets-ens.etsmtl.ca/Secure/DocEvolutionMoyenne.aspx", (resultatRequete) => {
        console.log(`[Signets Plugin] Mise à jour des informations sur le GPA`);

        let etatProgrammes = [];

        const formatterDonneesCheminement = donnees => {
            return donnees.split(/(?<=,[0-9]{2})|(?<=SessionCréditsMoyenne)/).map(e => {
                if (/[0-9]{1,2}[AHE]{1}/.test(e)) {
                    let posSession = e.search(/[AHE]/);
                    return (e.substring(posSession, posSession + 3) + " "
                        + e.substring(posSession + 3, e.indexOf(",") - 1) + " "
                        + e.substring(e.indexOf(",") - 1));
                } else if (/^[0-9]{4} /.test(e)) {
                    e = e.replace(/:.*:/g, "");
                    return (e.substring(0, e.indexOf(" "))
                        + "|" + e.substring(e.indexOf(" ") + 1, e.lastIndexOf(" "))
                        + "|" + e.substring(e.lastIndexOf(" ") + 1));
                } else return e;
            });
        };

        const ajouterInformationsCheminement = (data, indexProgramme) => {
            for (let line of data) {
                if (line.split("|").length === 3) {
                    let splittedLine = line.split("|");

                    if (!etatProgrammes.some(p => p.code === parseInt(splittedLine[0]))) {
                        etatProgrammes.push({
                            nom: splittedLine[1],
                            code: parseInt(splittedLine[0]),
                            moyennecumulative: getNumber(splittedLine[2]),
                            sessions: []
                        });
                    }

                } else if (line.split(" ").length === 3) {
                    let splittedLine = line.split(" ");

                    if (!etatProgrammes[indexProgramme].sessions.some(s => s.id === splittedLine[0])) {

                        etatProgrammes[indexProgramme].sessions.push({
                            id: splittedLine[0],
                            credits: parseInt(splittedLine[1]),
                            moyenne: getNumber(splittedLine[2])
                        })
                    }
                }
            }
        };

        resultatRequete = minifyHTML(resultatRequete);

        let stringVerificationPlusieursProgrammes =
            formatterDonneesCheminement(
                stripHTML(
                    getSubstringBetween(
                        resultatRequete,
                        `<strong>Choisissez le programme d'études dans liste ci-dessous:`,
                        `<div id="ctl00_ContentPlaceHolderMain_gridSessions_eppool"`
                    )
                )
            );

        let lignesDeProgrammes = stringVerificationPlusieursProgrammes.filter(e => e.includes("|"));
        let ilYaPlusieursProgrammes = stringVerificationPlusieursProgrammes.length > 1;

        if (!ilYaPlusieursProgrammes) {
            ajouterInformationsCheminement(stringVerificationPlusieursProgrammes, 0);
            // console.log(JSON.stringify(etatProgrammes, null, 2));
            chrome.storage.sync.set({ etatProgrammes: etatProgrammes });

        } else {
            // il faut chercher l'information de tous les programmes
            let codesDeProgrammes = lignesDeProgrammes.map(l => l.split("|")[0]);

            //il faut envoyer une requête POST avec des arguments bien définis pour accéder aux données d'anciens programmes
            let viewState = encodeURIComponent(getSubstringBetween(resultatRequete, `id="__VIEWSTATE" value="`, `" />`));
            let viewStateGenerator = encodeURIComponent(getSubstringBetween(resultatRequete, `id="__VIEWSTATEGENERATOR" value="`, `" />`));
            let eventValidation = encodeURIComponent(getSubstringBetween(resultatRequete, `id="__EVENTVALIDATION" value="`, `" />`));

            for (let i = 0, length = codesDeProgrammes.length; i < length; i++) {

                let data = `ctl00$ContentPlaceHolderMain$lisPgm=${codesDeProgrammes[i]}`
                    + `&__EVENTTARGET=ctl00$ContentPlaceHolderMain$lisPgm`
                    + `&__VIEWSTATE=${viewState}`
                    + `&__VIEWSTATEGENERATOR=${viewStateGenerator}`
                    + `&__EVENTVALIDATION=${eventValidation}`;

                let xhr = new XMLHttpRequest();
                xhr.open('POST', 'https://signets-ens.etsmtl.ca/Secure/DocEvolutionMoyenne.aspx', true);
                xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
                xhr.onload = function () {
                    // do something to response

                    ajouterInformationsCheminement(
                        formatterDonneesCheminement(
                            stripHTML(
                                getSubstringBetween(
                                    minifyHTML(xhr.responseText),
                                    `<strong>Choisissez le programme d'études dans liste ci-dessous:`,
                                    `<div id="ctl00_ContentPlaceHolderMain_gridSessions_eppool"`
                                )
                            )
                        ), i
                    );

                    // console.log(JSON.stringify(etatProgrammes, null, 2));
                    chrome.storage.sync.set({ etatProgrammes: etatProgrammes });
                };
                xhr.send(data);
            }
        }
    });
}

function minifyHTML(string) { return string.replace(/^\s+|\r\n|\n|\r|(>)\s+(<)|\s+$/gm, '$1$2'); }

function stripHTML(string) { return string.replace(/<[^>]*>?/gm, ''); }

function injectCSS(css) {
    let style = document.createElement('style');
    style.setAttribute('class', 'signets-plugin-style');
    style.type = 'text/css';
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
    return style;
}

function injectScript(injectedCode) {
    let script = document.createElement("script");
    script.setAttribute('class', 'signets-plugin-script');
    script.textContent = injectedCode;
    document.head.appendChild(script);
}

function gererPageCours() {
    console.log(`[Interface cours]`);

    let expandButtons = Array.from(document.querySelectorAll('[mkr="expColBtn"]'));

    chrome.storage.sync.get('noColors', function (arg) {

        if (!arg.noColors) {
            injectCSS( /*css*/ `
                tbody.igg_Office2010BlueItem tr td{
                    border-right: 1px solid rgba(0,0,0,0.07);
                    border-top: 0px solid rgba(0,0,0,0.07);
                    border-bottom: 1px solid rgba(0,0,0,0.07);
                    background-color:inherit !important;
                }

                [aria-describedby*="_columnheader_6"]{
                    text-align: center !important;
                }
                
                .igtab_Office2010BlueTHContent{
                    overflow:auto!important;
                }`
            );
        } else {
            let injectBorderToResize = injectCSS( /*css*/ ` tbody.igg_Office2010BlueItem tr td{ border-right: 1px solid #bccadf; } `);
            setTimeout(() => {
                document.head.removeChild(injectBorderToResize);
                injectCSS( /*css*/ `
                [aria-describedby*="_columnheader_6"]{
                    text-align: center !important;
                }
                .igtab_Office2010BlueTHContent{
                    overflow:auto!important;
                }
                `);
            }, 50);
        }
    });

    tippy.setDefaultProps(
        {
            allowHTML: true,
            animateFill: true,
            animation: 'scale',
            interactive: true,
            interactiveBorder: 10,
            placement: 'left',
            theme: 'light-border'
        }
    );
    let sessionsAvecGraphiqueActive = [];

    let afficherRangCentile = (secondRun = false) => {
        // console.log(`Affiché rang centile`);
        let colonnesRangCentile = Array.from(document.querySelectorAll('[key="Sigle"]'));

        for (let colonneRCentile of colonnesRangCentile) {
            colonneRCentile.innerHTML = "R.centile";
            let classDisplayNone = colonneRCentile.classList[1];
            let elementsWithDisplayNone = Array.from(document.querySelectorAll(`.${classDisplayNone}`));
            for (let element of elementsWithDisplayNone) {
                element.classList.remove(classDisplayNone);
            }
            colonneRCentile.classList.remove(classDisplayNone);
        }

        let tableauxCours = Array.from(document.querySelectorAll(`[mkr="dataTbl.hdn"]`));

        /** To auto resize columns width */
        for (let tableau of tableauxCours) {
            tableau.style.width = "99.99%";
            setTimeout(() => {
                tableau.setAttribute("style", "table-layout: fixed;width: 100%;visibility: inherit;");
            }, 50);
        }

        let sessions = Array.from(document.querySelectorAll('[aria-describedby="ctl00_columnheader_1"]'));

        let uneCoteDeCoursAChange = false;

        for (let session of sessions) {
            let rangCentilesCours = Array.from(session.parentNode.nextSibling.querySelectorAll('[aria-describedby*="_columnheader_6"]'));
            let noteCours = Array.from(session.parentNode.nextSibling.querySelectorAll('[aria-describedby*="_columnheader_5"]'));
            let siglesCours = Array.from(session.parentNode.nextSibling.querySelectorAll('[aria-describedby*="_columnheader_2"]')).map(x => x.textContent.split("-")[0]);
            let liensCours = Array.from(session.parentNode.nextSibling.querySelectorAll('[aria-describedby*="_columnheader_2"]')).map(x => x.firstElementChild != null ? x.firstElementChild.href : "");

            let donneesGraphique = [];  //structure : [[sigle,note,moyenne],[sigle,note,moyenne],...]

            for (let i = 0, length = rangCentilesCours.length; i < length; i++) {

                if (noteCours[i].innerHTML === "K") noteCours[i].parentNode.setAttribute("style", `background-color: lightblue;`);

                let cle = `${session.innerHTML.replace(/ /g, "")}${siglesCours[i]}`;

                chrome.storage.sync.get([cle, 'theme', 'showGrades', 'preciseGrades', 'etatProgrammes'], function (arg) {
                    let theme = "default-theme";
                    if (typeof arg.theme !== 'undefined') {
                        theme = arg.theme;
                    }

                    const setTabValues = (note, moyenne, rangCentile, color, denominator) => {
                        rangCentilesCours[i].innerHTML = rangCentile;
                        rangCentilesCours[i].style.color = "black";
                        rangCentilesCours[i].style.userSelect = "auto";
                        rangCentilesCours[i].parentNode.setAttribute("style", `background-color: ${color};`);

                        noteCours[i].style.whiteSpace = "nowrap";

                        if (noteCours[i].innerHTML === "" && color !== "white" && note) noteCours[i].innerHTML = arg.preciseGrades === true ?
                            `${note}%×${denominator}`
                            : `${note}%`;

                        if (/%|\//g.test(noteCours[i].innerHTML) && `${note}%` !== noteCours[i].innerHTML.split(" | ")[1]) {
                            noteCours[i].innerHTML = noteCours[i].innerHTML.split(" | ")[0];
                        }

                        if (typeof arg.showGrades !== 'undefined' && arg.showGrades === true && noteCours[i].innerHTML !== "" && !/%|\//g.test(noteCours[i].innerHTML)) {
                            noteCours[i].innerHTML += ` | ${note}%`;
                        }
                        donneesGraphique.push([siglesCours[i], note, moyenne ? moyenne : 0]);
                    }

                    if (typeof arg.etatProgrammes === 'undefined') {
                        fetchInformationsCheminement();
                    }/*  else if(session === sessions[0] && i === 0 && secondRun){
                        console.log(JSON.stringify(arg.etatProgrammes, null, 2));
                    } */

                    if (typeof arg[cle] !== 'undefined' && !isNaN(parseInt(arg[cle][2]))) {

                        if (arg[cle][4] !== noteCours[i].innerHTML && !noteCours[i].innerHTML.includes("%")) {
                            uneCoteDeCoursAChange = true;
                        }

                        setTabValues(arg[cle][2], arg[cle][3], arg[cle][0], arg[cle][1], arg[cle][4]);

                        if (noteCours.some(e => (e.innerHTML === "" || /^[0-9.]{0,4}%/g.test(e.innerHTML))) && secondRun) {

                            obtenirSommaireCours(liensCours[i], true, (fetchedData) => {

                                if (![arg[cle][2], arg[cle][3], arg[cle][0], arg[cle][1]].every((e, i) => e === fetchedData[i]) && !(isNaN(fetchedData[0]) && isNaN(fetchedData[1]))) {
                                    console.log(`notes mises à jour pour ${cle}`);
                                    setTabValues(fetchedData[0], fetchedData[1], fetchedData[2], fetchedData[3], fetchedData[4]);
                                    chrome.storage.sync.set({ [cle]: [fetchedData[2], fetchedData[3], fetchedData[0], fetchedData[1], fetchedData[4], fetchedData[5]] });
                                }
                            });
                        }

                    } else {

                        const thereIsNoData = () => {
                            if (rangCentilesCours[i].style.color !== "black") rangCentilesCours[i].style.color = "transparent";
                            if (rangCentilesCours[i].style.userSelect !== "auto") rangCentilesCours[i].style.userSelect = "none";

                            donneesGraphique.push([siglesCours[i], 0, 0]);
                        }

                        if (secondRun) {
                            if (liensCours[i] !== "") {

                                // obtenirSommaireCours(liensCours[i], true, (fetchedData) => {  //version asynchrone
                                //     if (!(isNaN(fetchedData[0]) && isNaN(fetchedData[1]))) {
                                //         setTabValues(fetchedData[0], fetchedData[1], fetchedData[2], fetchedData[3], fetchedData[4]);
                                //         chrome.storage.sync.set({ [cle]: [fetchedData[2], fetchedData[3], fetchedData[0], fetchedData[1], fetchedData[4], fetchedData[5]] });
                                //     } else {
                                //         thereIsNoData();
                                //         chrome.storage.sync.set({ [cle]: ["", "white", 0, 0, 0, ""] });
                                //     } 
                                // });
                                let fetchedData = obtenirSommaireCours(liensCours[i]);
                                if (!(isNaN(fetchedData[0]) && isNaN(fetchedData[1]))) {
                                    setTabValues(fetchedData[0], fetchedData[1], fetchedData[2], fetchedData[3], fetchedData[4]);
                                    chrome.storage.sync.set({ [cle]: [fetchedData[2], fetchedData[3], fetchedData[0], fetchedData[1], fetchedData[4], fetchedData[5]] });
                                } else {
                                    thereIsNoData();
                                    chrome.storage.sync.set({ [cle]: ["", "white", 0, 0, 0, ""] });
                                }

                            } else {
                                thereIsNoData();
                            }
                        }
                    }

                    if (donneesGraphique.some(x => x[1] !== 0 || x[2] !== 0) && !sessionsAvecGraphiqueActive.includes(cle) && i == length - 1) {
                        // console.log(`Entre graphique`);
                        let graphique = document.createElement('canvas');
                        graphique.width = "239px";
                        graphique.height = "239px";
                        graphique.style = "display: block; width: 239px; height: 239px;";

                        let data = {
                            labels: donneesGraphique.map(x => x[0]),
                            datasets: [
                                {
                                    label: "Votre moyenne",
                                    backgroundColor: theme === "default-theme" ? "#4F7795" : "#B90E1C",
                                    data: donneesGraphique.map(x => x[1])
                                },
                                {
                                    label: "Moy. du groupe",
                                    backgroundColor: "gray",
                                    data: donneesGraphique.map(x => x[2])
                                }
                            ]
                        };

                        new Chart(graphique, {
                            type: 'bar',
                            data: data,
                            options: {
                                scales: {
                                    yAxes: [{
                                        ticks: {
                                            suggestedMin: 50,
                                            suggestedMax: 100
                                        }
                                    }]
                                },
                                tooltips: {
                                    mode: 'index',
                                    intersect: true,
                                    // itemSort: function (a, b) {
                                    //     return b.yLabel - a.yLabel
                                    // },
                                    callbacks: {
                                        label: function (tooltipItem, data) {
                                            let index = tooltipItem.index;
                                            let datasetIndex = tooltipItem.datasetIndex;
                                            let label = data.datasets[tooltipItem.datasetIndex].label || '';
                                            let value = data.datasets[datasetIndex].data[index];
                                            return /* label + " : " +  */value + "%";
                                        }
                                    }
                                }
                            }
                        });

                        tippy(session.parentNode.nextSibling, {
                            content: graphique,
                        });
                        sessionsAvecGraphiqueActive.push(cle);
                    }
                });
            }

        }
        if (uneCoteDeCoursAChange) {
            console.log(`Une cote a changé`);
            fetchInformationsCheminement();
        }
    }

    afficherRangCentile();


    setTimeout(() => {
        for (let expandButton of expandButtons) {
            if (expandButton.getAttribute("alt") === "Expand Row") expandButton.click();
        }
        afficherRangCentile(true);
    }, 100);
}

function gererPageNotes() {
    console.log(`[Interface notes]`);

    chrome.storage.sync.get('noColors', function (arg) {
        if (!arg.noColors) {
            injectCSS( /*css*/ `
                tbody.igg_Office2010BlueItem tr td{
                    border-right: 1px solid rgba(0,0,0,0.07);
                    border-top: 0px solid rgba(0,0,0,0.07);
                    border-bottom: 1px solid rgba(0,0,0,0.07);
                    background-color:inherit !important;
                }
                
                .igtab_Office2010BlueTHContent{
                    overflow:auto!important;
                }

                [aria-describedby="grilleNotes_columnheader_0"]{
                    font-family:"Verdana";
                    font-size:1.3em !important;
                    letter-spacing: -0.25px;
                    color:rgba(0,0,0,0.75);
                    line-height: 1.4!important;
                    font-weight:bolder;

                    width:110px!important;
                }

                [aria-describedby="grilleNotes_columnheader_10"]{
                    width:78px!important;
                }
                `
            );
        }
    });

    let session = document.querySelector('#ctl00_ContentPlaceHolderMain_txtTrimestre1').innerHTML.replace(/ /g, "");
    let cours = document.querySelector('#ctl00_ContentPlaceHolderMain_txtSigle1').innerHTML;

    let grosConteneur = document.querySelector('.igtab_Office2010BlueTHContentHolder');
    grosConteneur.style.height = ""; // to auto resize height

    let mesNotes = Array.from(document.querySelectorAll('[aria-describedby="grilleNotes_columnheader_3"]'));
    let notesGrp = Array.from(document.querySelectorAll('[aria-describedby="grilleNotes_columnheader_6"]'));
    let ecartsTypes = Array.from(document.querySelectorAll('[aria-describedby="grilleNotes_columnheader_7"]'));
    let rangsCentiles = Array.from(document.querySelectorAll('[aria-describedby="grilleNotes_columnheader_9"]'));
    let denominateurs = Array.from(document.querySelectorAll('[aria-describedby="grilleNotes_columnheader_4"]'));
    let ponderations = Array.from(document.querySelectorAll('[aria-describedby="grilleNotes_columnheader_5"]'));
    let medianes = Array.from(document.querySelectorAll('[aria-describedby="grilleNotes_columnheader_8"]'));

    let noteTotale = document.querySelector('#ctl00_ContentPlaceHolderMain_lesOnglets_tmpl0_txtTotal1');
    let noteGrpTotal = document.querySelector('#ctl00_ContentPlaceHolderMain_lesOnglets_tmpl0_txtMoyenne');
    let ecartTypeTotal = document.querySelector('#ctl00_ContentPlaceHolderMain_lesOnglets_tmpl0_txtEcartType');
    let medianeTotale = document.querySelector('#ctl00_ContentPlaceHolderMain_lesOnglets_tmpl0_txtMediane');

    let espacement = "&emsp;&emsp;&emsp;&emsp;";
    let valNoteTotale = getNumber(reformatterNote(noteTotale.innerHTML).split("/")[0]);
    let denominateurTotal = getNumber(reformatterNote(noteTotale.innerHTML).split("/")[1]);
    let valMoyTotale = getNumber(reformatterNote(noteGrpTotal.innerHTML).split("/")[0]);
    let rangCentileTotal = document.querySelector('#ctl00_ContentPlaceHolderMain_lesOnglets_tmpl0_txtRangCentile');
    let coteFinale = document.querySelector('#ctl00_ContentPlaceHolderMain_lesOnglets_tmpl0_txtCoteFinale');

    let donneesGraphique = [];

    document.querySelector("#ctl00_LoginViewLeftColumn_MenuVertical").innerHTML += /*html*/`
    </br>
    <canvas id="myChart" width="250" height="290"></canvas>
    </br>
    <div style="font-weight:bold; text-align:right; border-top: 1px solid #bbb;">
      </br>
      <a
         title="Si vous avez aimé mon extension, n'hésitez pas à aller mettre une étoile et partager avec vos amis :)" 
         target="_blank" 
         id="linksignetsplugin"
         href="https://chrome.google.com/webstore/detail/signets-plugin/bgbigmlncgkakhiaokjbhibkednbibpf">
           SIGNETS plugin
      </a>
    </div>`;

    noteTotale.setAttribute("style", `background-color: ${getColor(
        getNumber(noteTotale.innerHTML),
        getNumber(noteGrpTotal.innerHTML),
        getNumber(ecartTypeTotal.innerHTML),
        denominateurTotal !== 0)};`);

    if (denominateurTotal !== 0) {
        noteTotale.innerHTML = `${reformatterNote(noteTotale.innerHTML)} (${round2dec(toPercentage(valNoteTotale, denominateurTotal))}%)`;
        noteGrpTotal.innerHTML = `${reformatterNote(noteGrpTotal.innerHTML)} (${round2dec(toPercentage(valMoyTotale, denominateurTotal))}%)`;
        ecartTypeTotal.innerHTML += `&ensp;${espacement}(${round2dec(toPercentage(getNumber(ecartTypeTotal.innerHTML), denominateurTotal))}%)`;
        medianeTotale.innerHTML += `${espacement}(${round2dec(toPercentage(getNumber(medianeTotale.innerHTML), denominateurTotal))}%)`;

        chrome.storage.sync.set({
            [session + cours]: [
                rangCentileTotal.innerHTML,
                noteTotale.style.backgroundColor,
                round1dec(toPercentage(valNoteTotale, denominateurTotal)),
                round1dec(toPercentage(valMoyTotale, denominateurTotal)),
                round1dec(denominateurTotal),
                coteFinale.innerHTML
            ]
        });
        // console.log(`saved:`, `${session + cours}: ${[rangCentileTotal.innerHTML, noteTotale.style.backgroundColor, `${Math.round(valNoteTotale / denominateurTotal * 100)}%`]}`);
    }

    for (let i = 0; i < notesGrp.length; i++) {
        let noteEstRentre = notesGrp[i].innerHTML !== "&nbsp;";
        if (noteEstRentre && mesNotes[i].innerHTML === "&nbsp;") {
            mesNotes[i].innerHTML = 0;
            rangsCentiles[i].innerHTML = 0;
        }
        mesNotes[i].parentNode.setAttribute("style", `background-color: ${getColor(
            getNumber(mesNotes[i].innerHTML),
            getNumber(notesGrp[i].innerHTML),
            getNumber(ecartsTypes[i].innerHTML),
            noteEstRentre)};`);

        // console.log(mesNotes[i].parentNode);
        mesNotes[i].style.fontWeight = "bold";
        notesGrp[i].style.fontWeight = "bold";

        if (noteEstRentre) {
            let maNoteEnPourcentage = toPercentage(getNumber(mesNotes[i].innerHTML), getNumber(denominateurs[i].innerHTML));
            let noteGrpEnPourcentage = toPercentage(getNumber(notesGrp[i].innerHTML), getNumber(denominateurs[i].innerHTML));
            let ponderation = getNumber(ponderations[i].innerHTML);
            donneesGraphique.push([maNoteEnPourcentage, noteGrpEnPourcentage, ponderation]);

            mesNotes[i].innerHTML += /*html*/` <span style="font-weight: normal;">(${Math.round(maNoteEnPourcentage)}%)</span>`;
            notesGrp[i].innerHTML += /*html*/` <span style="font-weight: normal;">(${Math.round(noteGrpEnPourcentage)}%)</span>`;
            medianes[i].innerHTML += /*html*/` <span style="font-weight: normal;">(${Math.round(toPercentage(getNumber(medianes[i].innerHTML), getNumber(denominateurs[i].innerHTML)))}%)</span>`;
            ponderations[i].innerHTML += /*html*/`</br>(${round2dec(getNumber(ponderations[i].innerHTML) * maNoteEnPourcentage / 100)})`;
            ecartsTypes[i].innerHTML += ` (${Math.round(toPercentage(getNumber(ecartsTypes[i].innerHTML), getNumber(denominateurs[i].innerHTML)))}%)`;
        }

    }

    // console.log(`donneesGraphique:`, donneesGraphique);

    let donneesGraphiqueNotes = donneesGraphique.map((x, i) => {
        let pourcentageNote = getSum(donneesGraphique.map(x2 => x2[2]).slice(0, i + 1));
        return {
            y: round1dec(getSum(donneesGraphique.map(x2 => x2[0] * x2[2]).slice(0, i + 1)) / pourcentageNote),
            x: round1dec(pourcentageNote)
        }
    });

    let donneesGraphiqueGroupe = donneesGraphique.map((x, i) => {
        let pourcentageNote = getSum(donneesGraphique.map(x2 => x2[2]).slice(0, i + 1));
        return {
            y: i !== donneesGraphique.length - 1 ? round1dec(getSum(donneesGraphique.map(x2 => x2[1] * x2[2]).slice(0, i + 1)) / pourcentageNote) : round1dec(toPercentage(valMoyTotale, denominateurTotal)),
            x: round1dec(pourcentageNote)
        }
    })

    chrome.storage.sync.get('theme', function (arg) {
        let theme = "default-theme";
        if (typeof arg.theme !== 'undefined') {
            theme = arg.theme;
        }
        let data = {
            datasets: [{
                label: "Votre moyenne",
                fill: false,
                showLine: true,
                lineTension: 0.1,
                backgroundColor: theme === "default-theme" ? "#4F7795" : "#B90E1C",
                borderColor: theme === "default-theme" ? "#4F7795" : "#B90E1C",
                borderCapStyle: 'square',
                borderDash: [],
                borderDashOffset: 0.0,
                borderJoinStyle: 'miter',
                pointBorderColor: "white",
                pointBorderWidth: 1,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: theme === "default-theme" ? "#4F7795" : "#B90E1C",
                pointHoverBorderColor: "white",
                pointHoverBorderWidth: 1.5,
                pointRadius: 3,
                pointHitRadius: 10,
                data: donneesGraphiqueNotes,
                spanGaps: true,
            }, {
                label: "Moy. du groupe",
                fill: false,
                showLine: true,
                lineTension: 0.1,
                backgroundColor: "Gray",
                borderColor: "gray",
                borderCapStyle: 'butt',
                borderDash: [],
                borderDashOffset: 0.0,
                borderJoinStyle: 'miter',
                pointBorderColor: "white",
                pointBorderWidth: 1,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: "darkgray",
                pointHoverBorderColor: "white",
                pointHoverBorderWidth: 1.5,
                pointRadius: 3,
                pointHitRadius: 10,
                data: donneesGraphiqueGroupe,
                spanGaps: false,
            }

            ]
        };

        let options = {
            scales: {
                yAxes: [{
                    ticks: {
                        suggestedMin: 60,
                        suggestedMax: 100
                    },
                    scaleLabel: {
                        display: true,
                        labelString: 'Moyenne en %',
                        fontSize: 12
                    }
                }],
                xAxes: [{
                    ticks: {
                        min: 0,
                        max: 100,
                        stepSize: 20,
                    },
                    scaleLabel: {
                        display: true,
                        labelString: 'Pourcentage cumulé de la note finale',
                        fontSize: 11.5
                    }
                }],
            },
            tooltips: {
                mode: 'index',
                intersect: true,
                itemSort: function (a, b) {
                    return b.yLabel - a.yLabel
                },
                callbacks: {
                    title: function (tooltipItems, data) {
                        return round1dec(data.datasets[tooltipItems[0].datasetIndex].data[tooltipItems[0].index].x) + "%";
                    },
                    label: function (tooltipItem, data) {
                        let index = tooltipItem.index;
                        let datasetIndex = tooltipItem.datasetIndex;
                        // let label = data.datasets[tooltipItem.datasetIndex].label || '';
                        let value = data.datasets[datasetIndex].data[index];
                        return value.y + "%";
                    }
                }
            },
            title: {
                display: true,
                padding: 3,
                fontSize: 16,
                text: 'Évolution de votre moyenne'
            }
        };

        new Chart(document.getElementById('myChart'), {
            type: 'scatter',
            data: data,
            options: options
        });

        document.querySelector('#linksignetsplugin').setAttribute("style", `color:${theme === "default-theme" ? "#4F7795" : "#B90E1C"}; text-decoration: none;`);
    });

    // Régler un bug relié aux menus déroulants qui ne fonctionnent plus quand on ajoute un élément au menu de gauche
    // il faut injecter un script dans la page pour avoir accès à ses fonctions jquery à partir de notre content script qui est isolé
    injectScript(/*javascript*/`$('#menuElem').menu_toggle_adder();`);
}

let infosProgrammesBac = {
    CTN: { code: 7625, credits: 117 },
    ELE: { code: 7694, credits: 115 },
    LOG: { code: 7084, credits: 116 },
    MEC: { code: 7684, credits: 115 },
    GOL: { code: 7495, credits: 114 },
    GPA: { code: 7485, credits: 117 },
    GTI: { code: 7086, credits: 116 }
}