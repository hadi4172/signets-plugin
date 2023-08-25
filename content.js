let etatProgrammes = [];
let titreDeLaPage = "";
let requetesEnCours = [];

let version = 0.54;

window.onload = () => {
    titreDeLaPage = document.title;

    if (window.location.href.includes(`signets-ens.etsmtl.ca/Secure/DetailsCoursGroupe`)) {
        gererPageNotes();

    } else if (["https://signets-ens.etsmtl.ca/Secure/MesNotes.aspx", "https://signets-ens.etsmtl.ca/"].includes(window.location.href)) {
        gererPageCours();
    }

    chrome.storage.sync.get(['notify', "version"], function (arg) {
        if (typeof arg.notify === 'undefined') {
            setTimeout(() => {
                alert("SIGNETS Plugin est personnalisable ; cliquez sur l'icône du plugin dans votre barre de navigateur pour voir les options qui s'offrent à vous !");
                chrome.storage.sync.set({
                    notify: "installation",
                    version: version
                });
            }, 3000);
        } else if (typeof arg.version === 'undefined') {
            setTimeout(() => {
                alert("SIGNETS Plugin a récemment été mis à jour! \nVous pouvez maintenant réorganiser l'ordre de vos évaluations par drag-and-drop pour ajuster le graphique d'évolution de votre moyenne \net \nestimer une cote en entrant une note et un rang centile (cliquez sur l'icone du plugin)!");
                chrome.storage.sync.set({ version: version });
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

function lightenOrDarkenColor(color, amount) {
    return '#' + color.replace(/^#/, '').replace(/../g,
        color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount))
            .toString(16)).substr(-2));
}

function getSum(arr) { return arr.reduce((a, b) => a + b, 0); }

// function integrate(f, a, b) {
//     let n = (b - a) / 0.0005;
//     let dx = (b - a) / n;
//     let area = 0;

//     for (let i = 1; i <= n; i++) {
//         let x0 = a + (i - 1) * dx;
//         let x1 = a + i * dx;
//         let ai = dx * (f(x0) + f(x1)) / 2.;

//         if (!isNaN(ai) && isFinite(ai)) area += ai;
//     }
//     return area;
// }

function integrate(f, a, b, n) {
    const returnIfFinite = (number) => (!isNaN(number) && isFinite(number)) ? number : 0;
    if (!n) n = (b - a) / 0.001;
    let dx = returnIfFinite((b - a) / n);
    let sum1 = returnIfFinite(f(a + dx / 2));
    let sum2 = 0;
    for (let i = 1; i < n; i++) {
        sum1 += returnIfFinite(f(a + dx * i + dx / 2));
        sum2 += returnIfFinite(f(a + dx * i));
    }
    return (dx / 6) * (returnIfFinite(f(a)) + returnIfFinite(f(b)) + 4 * sum1 + 2 * sum2);
}

function betaFunction(x, a, b) {
    const gamma = x => {
        let p = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
            771.32342877765313, -176.61502916214059, 12.507343278686905,
            -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
        ];
        if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gamma(1 - x));

        let a = p[0];
        let t = --x + 7.5;
        for (let i = 1; i < p.length; i++) a += p[i] / (x + i);

        return Math.sqrt(2 * Math.PI) * Math.pow(t, x + 0.5) * Math.exp(-t) * a;
    };

    const lngamma = x => Math.log(gamma(x));
    const lnBetaPDF = (x, a, b) => (lngamma(a + b) - lngamma(a) - lngamma(b) + (a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x));
    return Math.exp(lnBetaPDF(x, a, b));
}

function getIndexOfClosestNumber(x, arr) {
    let indexArr = arr.map((k) => Math.abs(k - x));
    let min = Math.min(...indexArr);
    return indexArr.indexOf(min);
}

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
        let coteFinale = getSubstringBetween(resultatRequete, `"ctl00_ContentPlaceHolderMain_lesOnglets_tmpl0_txtCoteFinale">`, `</span>`).replace(/ /g, "");

        let color = getColor(note, moyenne, ecartType, maximum !== 0)

        return [round1dec(toPercentage(note, maximum)), round1dec(toPercentage(moyenne, maximum)), rangCentile, color, maximum, coteFinale];
    }

    if (!asynchrone) {
        resultatRequete = getSubstringBetween(getSourceFromLink(link), `Sommaire du cours-groupe`, `Périodes d'abandon`);
        if (resultatRequete === "Error") return [NaN, NaN, "&nbsp;", "white", NaN, ""];
        return decomposerResultat(resultatRequete);
    } else {
        getSourceFromLinkAsync(link, (resultText) => {
            let resultatRequete = getSubstringBetween(resultText, `Sommaire du cours-groupe`, `Périodes d'abandon`);
            if (resultatRequete !== "Error") callback(decomposerResultat(resultatRequete));
            else callback([NaN, NaN, "&nbsp;", "white", NaN, ""]);
        });
    }

}

function getSourceFromLink(link) {
    requetesEnCours.push(link);
    document.title = "Chargement...";

    let r = new XMLHttpRequest();

    r.open('GET', link, false);
    r.send(null);
    if (r.status == 200) {
        requetesEnCours = requetesEnCours.filter(l => l !== link);
        if (requetesEnCours.length === 0) document.title = titreDeLaPage;

        return minifyHTML(r.responseText);
    } else {
        requetesEnCours = requetesEnCours.filter(l => l !== link);
        if (requetesEnCours.length === 0) document.title = titreDeLaPage;

        return "Error";
    }
}

async function getSourceFromLinkAsync(link, callback) {
    requetesEnCours.push(link);
    document.title = "Chargement...";

    let response = await fetch(link);
    if (response.status == 200) {
        callback(await response.text());

        requetesEnCours = requetesEnCours.filter(l => l !== link);
        if (requetesEnCours.length === 0) document.title = titreDeLaPage;
    } else {
        requetesEnCours = requetesEnCours.filter(l => l !== link);
        if (requetesEnCours.length === 0) document.title = titreDeLaPage;
    }
}

function fetchInformationsCheminement(callback = () => { }) {

    //première requête GET pour obtenir les informations sur le cheminement pour un seul programme
    //ou pour obtenir les arguments nécessaires pour lancer une requête POST et chercher les informations des autres programmes
    getSourceFromLinkAsync("https://signets-ens.etsmtl.ca/Secure/DocEvolutionMoyenne.aspx", (resultatRequete) => {
        console.log(`[Signets Plugin] Mise à jour des informations sur le GPA`);

        etatProgrammes = [];    //remise à zéro

        const decoder = str => str.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));

        const formatterDonneesCheminement = donnees => {
            /**
             * //Exemple de ce qui est retourné par la méthode
             * [
                    '7084|Baccalauréat en génie logiciel|0,00',
                    '5730|Cheminement universitaire en technologie|2,75',
                    'SessionCréditsMoyenne',
                    'A20 16 2,76',
                    'H21 3 2,70'
                ]
            */
            return decoder(donnees).split(/(?<=,[0-9]{2})|(?<=SessionCréditsMoyenne)/).map(e => {
                if (/[0-9]{1,2}[AHEÉ]{1}/.test(e)) {
                    let posSession = e.search(/[AHEÉ]/);
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
            /*
            // Exemple de ce que la fonction ajoute à état programme
            let structureEtatProgrammes = [
                {
                    nom: "Baccalauréat en génie logiciel",
                    code: 7084,
                    moyennecumulative: 2.76,
                    sessions: [
                        {
                            id: "A20",
                            credits: 16,
                            moyenne: 3.18
                        }//,...
                    ]
                }//,...
            ]
            */
            for (let line of data) {
                if (line.split("|").length === 3) {
                    let splittedLine = line.split("|");

                    if (!etatProgrammes.some(p => p.code === parseInt(splittedLine[0])) && parseInt(splittedLine[0]) > 1000) {
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

        const traitementDesDonneesRecues = donneesRecues => {
            return formatterDonneesCheminement(
                stripHTML(
                    getSubstringBetween(
                        donneesRecues,
                        `<strong>Choisissez le programme d'études dans liste ci-dessous:`,
                        `<div id="ctl00_ContentPlaceHolderMain_gridSessions_eppool"`
                    )
                )
            )
        }

        resultatRequete = minifyHTML(resultatRequete);

        let stringVerificationPlusieursProgrammes = traitementDesDonneesRecues(resultatRequete);

        let lignesDeProgrammes = stringVerificationPlusieursProgrammes.filter(e => e.includes("|"));
        let ilYaPlusieursProgrammes = lignesDeProgrammes.length > 1;

        if (!ilYaPlusieursProgrammes) { //nous avons déja toute les informations requises
            ajouterInformationsCheminement(stringVerificationPlusieursProgrammes, 0);
            // console.log(JSON.stringify(etatProgrammes, null, 2));
            chrome.storage.sync.set({ etatProgrammes: etatProgrammes });
            callback();
        } else {
            // il faut chercher l'information de tous les programmes
            let codesDeProgrammes = lignesDeProgrammes.map(l => l.split("|")[0]);

            //il faut envoyer une requête POST avec des arguments bien définis pour accéder aux données d'anciens programmes
            let viewState = encodeURIComponent(getSubstringBetween(resultatRequete, `id="__VIEWSTATE" value="`, `" />`));
            let viewStateGenerator = encodeURIComponent(getSubstringBetween(resultatRequete, `id="__VIEWSTATEGENERATOR" value="`, `" />`));
            let eventValidation = encodeURIComponent(getSubstringBetween(resultatRequete, `id="__EVENTVALIDATION" value="`, `" />`));

            for (let i = 0, length = codesDeProgrammes.length; i < length; i++) {
                if (i === 0) {      //nous avons déja accès aux informations du programme le plus récent, pas besoin de faire une autre requête pour lui
                    ajouterInformationsCheminement(stringVerificationPlusieursProgrammes, 0);
                } else {

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
                        ajouterInformationsCheminement(traitementDesDonneesRecues(minifyHTML(xhr.responseText)), i);

                        if (i === (length - 1)) {
                            console.log(JSON.stringify(etatProgrammes, null, 2));
                            chrome.storage.sync.set({ etatProgrammes: etatProgrammes });
                            callback();
                        }
                    };
                    xhr.send(data);
                }
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

    chrome.storage.sync.get(['noColors', 'etatProgrammes', 'theme', 'creditsSansGPAParProgramme', 'creditsEchouesParProgramme', 'coursRepris'], function (arg) {

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

        let theme = "default-theme";
        if (typeof arg.theme !== 'undefined') {
            theme = arg.theme;
        }

        let coursRepris = [];
        if (typeof arg.coursRepris !== 'undefined') {
            coursRepris = arg.coursRepris;
        }

        const chargerElementsDeGauche = (etatProgrammes) => {
            let leProgrammeActuelEstConnu = infosProgrammes.some((p, i) => p.code === etatProgrammes[0].code /* && i < INDEX_MAITRISE */);

            for(let cours of coursRepris) {
                for(let programme of etatProgrammes) {
                    if(cours.programme == programme.code
                        && programme.sessions.some(s => s.id == cours.sessionReprise)) {
                        let session = programme.sessions.find(s => s.id == cours.sessionReprise);

                        session.creditsReprise = 0;
                        session.creditsReprise += cours.credits;
                    }
                }
            }

            document.querySelector("#ctl00_LoginViewLeftColumn_MenuVertical").innerHTML += /*html*/`
        <div id="elementsAjoutesAGauche" style="transition:opacity 0.25s ease-in-out;">
            ${leProgrammeActuelEstConnu ? /*html*/`
            </br>
            <div id="progressbar-programme" style="user-select: none; -webkit-user-select: none;">
            <div style="width: 100%; fontSize: 12; color:dimgray; text-align:center; font-weight: bolder;">
                Complétion du programme
            </div>
            </br>
            <div
                class="myBar label-center"
                width="100%"
                data-value="50"
                style="width: 100%;"
                title="Les cours actuellement en progression sont inclus dans le calcul et leurs crédits sont multipliés par leur % de complétion"
                >
            </div>
            </div>`
                    : ""}

            </br>
            <canvas id="GPAChart" width="250" height="300"></canvas>
            </br>
        </div>
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

            let baseColor = theme === "default-theme" ? "#4F7795" : "#B90E1C";

            let labels = [...new Set(etatProgrammes.map((p, i) => etatProgrammes[i].sessions.map(s => s.id)).reverse().flat()), ""];

            let dataSets = etatProgrammes.map((p, i) => {
                let programColor = lightenOrDarkenColor(baseColor, 75 * i);

                let GPACumulatifs = etatProgrammes[i].sessions.map((s, j) => {

                    let sessionsEcoules = etatProgrammes[i].sessions.slice(0, j + 1);

                    y = round2dec(getSum(sessionsEcoules.map(m => m.moyenne * m.credits)) /
                            (getSum(sessionsEcoules.map(m => m.credits)) - getSum(sessionsEcoules.map(m => m.creditsReprise ?? 0))))
                    return {
                        x: sessionsEcoules[sessionsEcoules.length - 1].id,
                        y: y
                    };
                });

                let sigleProgramme = infosProgrammes.find(k => k.code == etatProgrammes[i].code);

                let label = typeof sigleProgramme !== "undefined" ? sigleProgramme.sigle : etatProgrammes[i].code;

                return {
                    label: label,
                    fill: false,
                    showLine: true,
                    lineTension: 0.1,
                    backgroundColor: programColor,
                    borderColor: programColor,
                    borderCapStyle: 'square',
                    borderJoinStyle: 'miter',
                    pointBorderColor: baseColor,
                    pointBorderWidth: 1,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: programColor,
                    pointHoverBorderColor: baseColor,
                    pointHoverBorderWidth: 1.5,
                    pointRadius: 3,
                    pointHitRadius: 10,
                    data: GPACumulatifs,
                    spanGaps: true,
                }
            });

            let data = {
                labels: labels,
                datasets: dataSets.reverse()
            };

            let options = {
                hover: {
                    mode: 'nearest'
                },
                scales: {
                    yAxes: [{
                        ticks: {
                            // min: 0,
                            max: 4.3,
                            suggestedMin: 2
                        },
                        scaleLabel: {
                            display: true,
                            labelString: 'Cote cumulative',
                            fontSize: 12
                        }
                    }],
                    xAxes: [{
                        scaleLabel: {
                            display: true,
                            labelString: 'Session',
                            fontSize: 11.5
                        }
                    }]
                },
                tooltips: {
                    callbacks: {
                        title: function (tooltipItems, data) {
                            return data.datasets[tooltipItems[0].datasetIndex].data[tooltipItems[0].index].x;
                        }
                    }
                },
                title: {
                    display: true,
                    padding: 3,
                    fontSize: 12,
                    text: 'Évolution de votre cote'
                }
            };

            new Chart(document.getElementById('GPAChart'), {
                type: 'line',
                data: data,
                options: options
            });

            if (leProgrammeActuelEstConnu) {
                let creditsReussisNAffectantPasLaMoyenne = undefined;
                let creditsEchoues = undefined;

                if (typeof arg.creditsSansGPAParProgramme !== 'undefined') {
                    creditsReussisNAffectantPasLaMoyenne = arg.creditsSansGPAParProgramme.find(p => p.programme == etatProgrammes[0].code).creditsSansGPA;
                }

                if (typeof creditsReussisNAffectantPasLaMoyenne === 'undefined') {
                    creditsReussisNAffectantPasLaMoyenne = 0;
                }

                if (typeof arg.creditsEchouesParProgramme !== 'undefined') {
                    creditsEchoues = arg.creditsEchouesParProgramme.find(p => p.programme == etatProgrammes[0].code);
                    if(typeof creditsEchoues !== 'undefined'){
                        creditsEchoues = creditsEchoues.creditsEchoues
                    }
                }

                if (typeof creditsEchoues === 'undefined') {
                    creditsEchoues = 0;
                }

                let creditsCompletes = getSum(etatProgrammes[0].sessions.map(s => s.credits)) + creditsReussisNAffectantPasLaMoyenne - creditsEchoues;
                let creditsDuProgramme = infosProgrammes.find(p => p.code === etatProgrammes[0].code).credits;

                let pourcentageComplete = Math.min(round1dec(toPercentage(creditsCompletes, creditsDuProgramme)), 100);

                new ldBar(".myBar", {
                    "stroke": theme === "default-theme" ? "#4F7795" : "#B90E1C",
                    // "stroke-width": 10,
                    "aspect-ratio": "none",
                    "preset": "line",
                    "value": pourcentageComplete,
                    // "data-stroke-width":"100%"
                });

                injectCSS(
                    /*css*/`
                    .ldBar-label {
                        color:dimgray;
                        margin-top:10px;
                        font-size: 1.15em;
                        font-weight: bolder;
                    }

                    .ldBar path.mainline {
                        stroke-width: 10;
                    }

                    .ldBar path.baseline {
                        stroke-width: 14;
                        stroke: #f1f2f3;
                        box-shadow: 20px 20px 20px 20px dimgray;
                    }

                    `);

                let barLabel = document.querySelector(".ldBar-label");
                let originalLabel = barLabel.innerHTML;

                let percentStyleHider = injectCSS(".ldBar-label::after {opacity:1;}");

                barLabel.addEventListener("mouseover", () => {
                    barLabel.innerHTML = `${round2dec(creditsCompletes)} / ${round1dec(creditsDuProgramme)}`;
                    percentStyleHider.innerHTML = ".ldBar-label::after {opacity:0;}";
                });

                barLabel.addEventListener("mouseout", () => {
                    barLabel.innerHTML = originalLabel;
                    percentStyleHider.innerHTML = ".ldBar-label::after {opacity:1;}";
                });



            }

            document.querySelector('#linksignetsplugin').setAttribute("style", `color:${baseColor}; text-decoration: none;`);

            // Régler un bug relié aux menus déroulants qui ne fonctionnent plus quand on ajoute un élément au menu de gauche
            // il faut injecter un script dans la page pour avoir accès à ses fonctions jquery à partir de notre content script qui est isolé
            injectScript(/*javascript*/`$('#menuElem').menu_toggle_adder();`);
        }

        if (typeof arg.etatProgrammes === 'undefined') {
            fetchInformationsCheminement(() => { chargerElementsDeGauche(etatProgrammes); });
        } else {
            chargerElementsDeGauche(arg.etatProgrammes);
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

        let coursNAffectantPasLaMoyenne = [];  //structure : [{cle:cle, programme:code, credits:credits},...]
        let coursEchoues = [];  //structure : [{cle:cle, programme:code, credits:credits},...]
        let coursRepris = [];  //structure : [{cle:cle, programme:code, credits:credits, session:id},...]

        for (let session of sessions) {
            let rangCentilesCours = Array.from(session.parentNode.nextSibling.querySelectorAll('[aria-describedby*="_columnheader_6"]'));
            let creditsCours = Array.from(session.parentNode.nextSibling.querySelectorAll('[aria-describedby*="_columnheader_4"]'));
            let programmeCours = Array.from(session.parentNode.nextSibling.querySelectorAll('[aria-describedby*="_columnheader_1"]'));
            let noteCours = Array.from(session.parentNode.nextSibling.querySelectorAll('[aria-describedby*="_columnheader_5"]'));
            let siglesCours = Array.from(session.parentNode.nextSibling.querySelectorAll('[aria-describedby*="_columnheader_2"]')).map(x => x.textContent.split("-")[0]);
            let liensCours = Array.from(session.parentNode.nextSibling.querySelectorAll('[aria-describedby*="_columnheader_2"]')).map(x => x.firstElementChild != null ? x.firstElementChild.href : "");

            let donneesGraphique = [];  //structure : [[sigle,note,moyenne],[sigle,note,moyenne],...]

            for (let i = 0, length = rangCentilesCours.length; i < length; i++) {

                if (/[KSVZ]/.test(noteCours[i].innerHTML)) noteCours[i].parentNode.setAttribute("style", `background-color: lightblue;`);

                if (/XX|L/.test(noteCours[i].innerHTML)) noteCours[i].parentNode.setAttribute("style", `background-color: #e1e0e0;`);

                let cle = `${session.innerHTML.replace(/ /g, "")}${siglesCours[i]}`;

                chrome.storage.sync.get([cle, 'theme', 'showGrades', 'preciseGrades', 'coursSansGPA', 'gpaInNumber', 'coursEchoues', 'coursRepris'], function (arg) {
                    let theme = "default-theme";
                    if (typeof arg.theme !== 'undefined') {
                        theme = arg.theme;
                    }

                    if (typeof arg.coursSansGPA !== 'undefined' && coursNAffectantPasLaMoyenne.length === 0) {
                        coursNAffectantPasLaMoyenne = arg.coursSansGPA;
                    }

                    if (typeof arg.coursEchoues !== 'undefined' && coursEchoues.length === 0) {
                        coursEchoues = arg.coursEchoues;
                    }

                    if (typeof arg.coursRepris !== 'undefined' && coursRepris.length === 0) {
                        coursRepris = arg.coursRepris;
                    }

                    if (typeof arg[cle] !== 'undefined') {
                        coursNAffectantPasLaMoyenne = coursNAffectantPasLaMoyenne.filter(e => e.cle !== cle ||
                            (/^[^A-Z‎]*$/.test(arg[cle][5]) && // il y a un caractère invisible dans cette ligne
                                e.credits === parseInt(creditsCours[i].innerHTML) * arg[cle][4] / 100));
                    }

                    if (/[KSVZ]/.test(noteCours[i].innerHTML) && !coursNAffectantPasLaMoyenne.some(e => e.cle === cle)) {
                        coursNAffectantPasLaMoyenne.push({
                            cle: cle,
                            programme: parseInt(programmeCours[i].innerHTML),
                            credits: parseInt(creditsCours[i].innerHTML)
                        });
                    }

                    if (/^[^A-Z‎]*$/.test(noteCours[i].innerHTML) && !coursNAffectantPasLaMoyenne.some(e => e.cle === cle) && typeof arg[cle] !== "undefined") { // il y a un caractère invisible dans cette ligne
                        coursNAffectantPasLaMoyenne.push({
                            cle: cle,
                            programme: parseInt(programmeCours[i].innerHTML),
                            credits: parseInt(creditsCours[i].innerHTML) * arg[cle][4] / 100
                        });
                    }

                    if (typeof arg[cle] !== "undefined" && /[EL]/.test(noteCours[i].innerHTML) && !coursEchoues.some(e => e.cle === cle)) {
                        coursEchoues.push({
                            cle: cle,
                            programme: parseInt(programmeCours[i].innerHTML),
                            credits: parseInt(creditsCours[i].innerHTML)
                        });
                    }

                    if (typeof arg[cle] !== "undefined" && /L/.test(noteCours[i].innerHTML) && !coursRepris.some(e => e.cle === cle)) {
                        let idSemestre = `${cle.slice(0, 1)}${cle.slice(-2 - 6, -6)}`;
                        let idSemestreReprise = "";

                        sessions.forEach((s, i) => {
                            // look for the first semester that have this course but with a cote other than L
                            let noteCours = Array.from(s.parentNode.nextSibling.querySelectorAll('[aria-describedby*="_columnheader_5"]'));
                            let siglesCours = Array.from(s.parentNode.nextSibling.querySelectorAll('[aria-describedby*="_columnheader_2"]')).map(x => x.textContent.split("-")[0])
                            let index = siglesCours.findIndex(s => s === cle.slice(-6));
                            if (index !== -1 && !/[L]/.test(noteCours[index].innerHTML)) {
                                let strSemestreCourant = s.innerHTML.replace(/ /g, "");
                                idSemestreReprise = `${strSemestreCourant.slice(0, 1)}${strSemestreCourant.slice(-2)}`;
                            }
                        });


                        coursRepris.push({
                            cle: cle,
                            programme: parseInt(programmeCours[i].innerHTML),
                            credits: parseInt(creditsCours[i].innerHTML),
                            session: idSemestre,
                            sessionReprise: idSemestreReprise
                        });
                    }

                    if (["LOG100", "LOG121"].includes(siglesCours[i])) {
                        let equivalentCote = infosCotes.find(c => noteCours[i].innerHTML.includes(c.lettre));
                        equivalentCote = typeof equivalentCote !== "undefined" ? equivalentCote.nombre : 0;
                        if (equivalentCote >= 2
                            && parseInt(programmeCours[i].innerHTML) === infosProgrammes.find(p => p.sigle === "CUT").code
                        ) {
                            chrome.storage.sync.get('etatProgrammes', function (arg) {
                                if (typeof arg.etatProgrammes !== 'undefined') {
                                    let objetProgramme = arg.etatProgrammes.find(e => e.code === 7084 || e.code === 7086);      //LOG ou GTI
                                    let id = `${cle.slice(0, 1)}${cle.slice(-2 - 6, -6)}`;
                                    if (!objetProgramme.sessions.some(s => s.id === id)) {
                                        objetProgramme.sessions.unshift({ credits: parseInt(creditsCours[i].innerHTML), id: id, moyenne: equivalentCote });
                                        console.log(`Ajouté cours crédité ${cle.slice(-6)} à ${id}`);
                                        chrome.storage.sync.set({ etatProgrammes: arg.etatProgrammes });
                                    }
                                }
                            });

                        }
                    }

                    if (i == length - 1 && session == sessions[sessions.length - 1]) {  //c'est laid mais on doit rester à l'interieur du chrome.storage.sync
                        let creditsSansGPAParProgramme = [];  //structure : [{programme:code, creditsSansGPA:credits},...]
                        let creditsEchouesParProgramme = [];  //structure : [{programme:code, creditsSansGPA:credits},...]
                        let programmesCreditsSansGPA = [...new Set(coursNAffectantPasLaMoyenne.map(c => c.programme))];
                        let programmesCreditsEchoues = [...new Set(coursEchoues.map(c => c.programme))];

                        for (const programme of programmesCreditsSansGPA) {
                            creditsSansGPAParProgramme.push({
                                programme: programme,
                                creditsSansGPA: getSum(coursNAffectantPasLaMoyenne.filter(c => c.programme === programme).map(c => c.credits))
                            });
                        }

                        for (const programme of programmesCreditsEchoues) {
                            creditsEchouesParProgramme.push({
                                programme: programme,
                                creditsEchoues: getSum(coursEchoues.filter(c => c.programme === programme).map(c => c.credits))
                            });
                        }

                        chrome.storage.sync.set({
                            coursSansGPA: coursNAffectantPasLaMoyenne,
                            creditsSansGPAParProgramme: creditsSansGPAParProgramme,
                            coursEchoues: coursEchoues,
                            coursRepris: coursRepris,
                            creditsEchouesParProgramme: creditsEchouesParProgramme
                        });
                    }

                    const setTabValues = (note, moyenne, rangCentile, color, denominator) => {
                        rangCentilesCours[i].innerHTML = rangCentile;
                        rangCentilesCours[i].style.color = "black";
                        rangCentilesCours[i].style.userSelect = "auto";
                        if (
                            rangCentilesCours[i].parentNode.getAttribute("style") !== "background-color: lightblue;"
                            && rangCentilesCours[i].parentNode.getAttribute("style") !== "background-color: #e1e0e0;"
                            )
                            rangCentilesCours[i].parentNode.setAttribute("style", `background-color: ${color};`);

                        noteCours[i].style.whiteSpace = "nowrap";

                        if ((noteCours[i].innerHTML === "" ||
                            parseFloat(noteCours[i].innerHTML.split("%")[0]) !== note ||
                            (typeof noteCours[i].innerHTML.split("×")[1] !== "undefined" &&
                                parseFloat(noteCours[i].innerHTML.split("×")[1]) !== denominator))
                            && color !== "white"
                            && !/[A-Z]|‎/.test(noteCours[i].innerHTML)  //il y a un caractère invisible ici
                            && note)
                            noteCours[i].innerHTML = arg.preciseGrades === true ?
                                `${note}%×${denominator}`
                                : `${note}%`;

                        let equivalentCote = infosCotes.find(c => noteCours[i].innerHTML.includes(c.lettre));
                        if (typeof equivalentCote !== "undefined" && arg.gpaInNumber === true) {
                            noteCours[i].innerHTML = equivalentCote.nombre.toFixed(1).replace(/\./, ".‎");   //il y a un caractère invisible ici
                        }

                        if (/%|\//g.test(noteCours[i].innerHTML) && `${note}%` !== noteCours[i].innerHTML.split(" | ")[1]) {
                            noteCours[i].innerHTML = noteCours[i].innerHTML.split(" | ")[0];
                        }

                        if (typeof arg.showGrades !== 'undefined' && arg.showGrades === true && noteCours[i].innerHTML !== "" && !/%|\/|[SZ]/g.test(noteCours[i].innerHTML)) {
                            noteCours[i].innerHTML += ` | ${note}%`;
                        }
                        donneesGraphique.push([siglesCours[i], note, moyenne ? moyenne : 0]);
                    }

                    if (typeof arg[cle] !== 'undefined' && !isNaN(parseInt(arg[cle][2]))) {

                        if (arg[cle][5] !== noteCours[i].innerHTML && !noteCours[i].innerHTML.includes("%")) {
                            uneCoteDeCoursAChange = true;
                            console.log(`La cote de ${cle} a changé`);
                            obtenirSommaireCours(liensCours[i], true, (fetchedData) => {
                                chrome.storage.sync.set({
                                    [cle]: [
                                        fetchedData[2],
                                        fetchedData[3],
                                        fetchedData[0],
                                        fetchedData[1],
                                        fetchedData[4],
                                        /[ABCDEF]/.test(noteCours[i].innerHTML) ? fetchedData[5] : noteCours[i].innerHTML
                                    ]
                                });
                            });
                        }

                        setTabValues(arg[cle][2], arg[cle][3], arg[cle][0], arg[cle][1], arg[cle][4]);

                        if (noteCours.some(e => (e.innerHTML === "" || /^[0-9.]{0,4}%/g.test(e.innerHTML))) && secondRun) {

                            obtenirSommaireCours(liensCours[i], true, (fetchedData) => {
                                // console.log("fetch data for " + cle);
                                if (![arg[cle][2], arg[cle][3], arg[cle][0], arg[cle][1], arg[cle][4], arg[cle][5]].every((e, i) => e === fetchedData[i]) && !(isNaN(fetchedData[0]) && isNaN(fetchedData[1]))) {
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
                                    chrome.storage.sync.set({ [cle]: ["", "white", 0, 0, 0, /[A-Z]/.test(noteCours[i].innerHTML) ? noteCours[i].innerHTML : ""] });
                                }

                            } else {
                                thereIsNoData();
                            }
                        }
                    }

                    if (uneCoteDeCoursAChange && i == length - 1 && session == sessions[sessions.length - 1]) {
                        console.log(`Une cote a changé`);
                        fetchInformationsCheminement();
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

                        let elementsDeGauche = document.getElementById('elementsAjoutesAGauche');

                        const hideGPAChart = () => {
                            if (Array.from(document.querySelectorAll(".tippy-box")).some(e => e.getAttribute("data-state") === "visible")) {
                                if (elementsDeGauche == null) elementsDeGauche = document.getElementById('elementsAjoutesAGauche');
                                elementsDeGauche.style.opacity = 0
                            }
                        }

                        const showGPAChart = () => {
                            if (!Array.from(document.querySelectorAll(".tippy-box")).some(e => e.getAttribute("data-state") === "visible")) {
                                elementsDeGauche.style.opacity = 1;
                            }
                        }

                        tippy(session.parentNode.nextSibling, {
                            content: graphique,
                            onShow(instance) {
                                setTimeout(() => {
                                    hideGPAChart();
                                }, 300);
                            },
                            onHidden(instance) {
                                setTimeout(() => {
                                    showGPAChart();
                                }, 300);
                            }
                        });
                        sessionsAvecGraphiqueActive.push(cle);
                    }
                });
            }

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

    injectCSS(/*css*/`
        [aria-describedby="grilleNotes_columnheader_4"]{
            width:45px!important;
        }

        [aria-describedby="grilleNotes_columnheader_1"]{
            width:20px!important;
        }

        [aria-describedby*="grilleNotes_columnheader"]{
            line-height:inherit!important;
            padding: 5px 10px 5px 6px!important;
        }
    `)

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
    let rangCentileTotal = document.querySelector('#ctl00_ContentPlaceHolderMain_lesOnglets_tmpl0_txtRangCentile');
    let coteFinale = document.querySelector('#ctl00_ContentPlaceHolderMain_lesOnglets_tmpl0_txtCoteFinale');

    let espacement = "&emsp;&emsp;&emsp;&emsp;";
    let valNoteTotale = getNumber(reformatterNote(noteTotale.innerHTML).split("/")[0]);
    let denominateurTotal = getNumber(reformatterNote(noteTotale.innerHTML).split("/")[1]);
    let valMoyTotale = getNumber(reformatterNote(noteGrpTotal.innerHTML).split("/")[0]);
    let valEcartTypeTotal = getNumber(ecartTypeTotal.innerHTML);
    let valMedianeTotale = getNumber(medianeTotale.innerHTML);
    let valRangCentileTotal = getNumber(rangCentileTotal.innerHTML);

    let donneesGraphique = [];

    document.querySelector("#ctl00_LoginViewLeftColumn_MenuVertical").innerHTML += /*html*/`
    </br>
    <canvas id="myChart" width="250" height="290"></canvas>
    </br>
    <div style="padding:3px;font-size: 15.5px; width:100%; text-align:center;"
    >
    <a
        style="font-weight:bold; color:dimgray; text-decoration: none;"
        target="_blank"
        href="https://en.wikipedia.org/wiki/Probability_density_function"
    >
        Distribution estimée des notes
    </a>
    </div>
    ${denominateurTotal >= 15 ?
    /*html*/`
    <canvas id="distributionBeta" width="250" height="275"></canvas>
    <div style="display: flex;align-items: center;justify-content: center;">
    <label style="font-size:11px;"><input type="radio" id="ecart5" name="typedistribution" value="0">&nbsp;Écart de 5</label>
    <label style="font-size:11px;"><input type="radio" id="ecart10" name="typedistribution" value="1">&nbsp;Écart de 10</label>
    <label style="font-size:11px;"><input type="radio" id="courbe" name="typedistribution" value="2">&nbsp;Courbe</label>
    </div>`
            :/*html*/`
      <div style="margin:5px 5px 5px 20px;">Le graphique sera affiché quand au moins 15% des points seront notés</div>`
        }
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

    let boutonsModeGraphiqueDistribution = Array.from(document.querySelectorAll('[name="typedistribution"]'));

    boutonsModeGraphiqueDistribution.forEach((e) => {
        e.addEventListener("click", () => {
            chrome.storage.sync.set({ modeGraphique: Number(e.value) });
            location.reload(true);
        });
    });

    chrome.storage.sync.get('modeGraphique', (arg) => {
        if (typeof arg.modeGraphique !== 'undefined') {
            boutonsModeGraphiqueDistribution[arg.modeGraphique].checked = true;
        } else {
            boutonsModeGraphiqueDistribution[0].checked = true;
            chrome.storage.sync.set({ modeGraphique: 0 });
        }
    });

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
                coteFinale.innerHTML.replace(/ /g, "")
            ]
        });
        console.log(`saved:`, `${session + cours}:`, [
            rangCentileTotal.innerHTML,
            noteTotale.style.backgroundColor,
            round1dec(toPercentage(valNoteTotale, denominateurTotal)),
            round1dec(toPercentage(valMoyTotale, denominateurTotal)),
            round1dec(denominateurTotal),
            coteFinale.innerHTML.replace(/ /g, "")
        ]);
    }

    mesNotes[0].parentNode.parentNode.classList.add('list-group');
    mesNotes[0].parentNode.parentNode.parentNode.style.removeProperty("width");

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

        mesNotes[i].parentNode.classList.add('list-group-item');

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
        } else {
            donneesGraphique.push(undefined);
        }

    }

    Sortable.create(document.querySelector(".list-group"), {
        animation: 150,  // ms, animation speed moving items when sorting, `0` — without animation
	    easing: "cubic-bezier(1, 0, 0, 1)", // Easing for animation. Defaults to null.
        direction: 'horizontal',
        // onEnd: (evt) => {
        //     let itemDragged = evt.item;  // dragged HTMLElement
        //     itemDragged.parentNode.parentNode.style.removeProperty("width");
        // },
        group: `${session + cours}Order`,
        store: {
            /**
             * Get the order of elements. Called once during initialization.
             * @param   {Sortable}  sortable
             * @returns {Array}
             */
            get: function (sortable) {
                let name = sortable.options.group.name;
                let order = localStorage.getItem(sortable.options.group.name);

                chrome.storage.sync.get(name, function (arg) {
                    if (typeof arg[name] !== 'undefined' && order == null) {
                        localStorage.setItem(sortable.options.group.name, arg[name]);
                    }
                });

                return order ? order.split('|') : [];
            },

            /**
             * Save the order of elements. Called onEnd (when the item is dropped).
             * @param {Sortable}  sortable
             */
            set: function (sortable) {
                let order = sortable.toArray();
                chrome.storage.sync.set({[sortable.options.group.name]:order.join('|')});
                localStorage.setItem(sortable.options.group.name, order.join('|'));
            }
        }
    });


    let ordreNotes = Array.from(document.querySelectorAll(".list-group-item")).map(e => parseInt(e.getAttribute('idx')));
    // console.log(`ordreNotes`, ordreNotes);
    let donneesGraphiqueOrdonne = [];

    // console.log(`donneesGraphique`, donneesGraphique);

    for (let i = 0; i < ordreNotes.length; i++) {
        donneesGraphiqueOrdonne.push(donneesGraphique[ordreNotes[i]]);
    }
    donneesGraphique = donneesGraphiqueOrdonne.filter(e => typeof e != "undefined");

    // console.log(`donneesGraphique:`, donneesGraphique);

    const injecterGraphiqueDistribution = (elementHote, moyenne, ecartType, mediane, rangCentile, note, theme, mode) => {
        // console.log(`ecartType`, ecartType);
        // console.log(`moyenne`, moyenne);
        moyenne /= 100;
        ecartType /= 100;
        mediane /= 100;

        const obtenirMeilleursComposants = () => {
            let composantsClassiques = [
                (-Math.pow(moyenne, 3) + Math.pow(moyenne, 2) - moyenne * Math.pow(ecartType, 2)) / Math.pow(ecartType, 2),
                ((moyenne - 1) * (Math.pow(moyenne, 2) - moyenne + Math.pow(ecartType, 2))) / Math.pow(ecartType, 2)
            ]; //utilise moyenne et écart type

            let v = ecartType / moyenne;
            let d = mediane;

            let composantsAlternatifs = [
                (1 / (6 * v * v)) * (-5 * d * v * v + Math.sqrt(Math.pow(5 * d * v * v + 3 * d - v * v - 3, 2) - 12 * (1 - 2 * d) * v * v) - 3 * d + v * v + 3),
                (1.5 * d) / (3 * v * v) + (2.5 * d) / 3 + ((Math.sqrt(Math.pow(5 * d * v * v + 3 * d - v * v - 3, 2) - 12 * (1 - 2 * d) * v * v)) / (6 * v * v)) * (-1 + 1 / d) - 1 / (v * v)
                - 1 / 3 + 1.5 / (3 * d * v * v) - 1 / (6 * d)
            ]; // coefficient de variation (ecartType / moyenne) et médiane

            let resultats = [
                integrate((x) => betaFunction(x, composantsClassiques[0], composantsClassiques[1]), 0, note / 100) * 0.99,
                integrate((x) => betaFunction(x, composantsAlternatifs[0], composantsAlternatifs[1]), 0, note / 100) * 0.99,
                integrate((x) => betaFunction(x, (composantsClassiques[0] + composantsAlternatifs[0]) / 2,
                    (composantsClassiques[1] + composantsAlternatifs[1]) / 2), 0, note / 100) * 0.99
            ];

            // console.log(`resultats`, resultats);
            // console.log(`rangCentile:`,rangCentile);
            // console.log(`getIndexOfClosestNumber(rangCentile / 100, resultats):`,getIndexOfClosestNumber(rangCentile / 100, resultats));

            switch (getIndexOfClosestNumber(rangCentile / 100, resultats)) {
                case 0: return [composantsClassiques[0], composantsClassiques[1]];
                case 1: return [composantsAlternatifs[0], composantsAlternatifs[1]];
                case 2: return [(composantsClassiques[0] + composantsAlternatifs[0]) / 2, (composantsClassiques[1] + composantsAlternatifs[1]) / 2];
                default: return null;
            }
        };

        let composants = obtenirMeilleursComposants();
        // console.log(`composants`, composants);

        let a = composants[0];
        let b = composants[1];

        let modeHistogramme = true;
        let ecartBande;

        switch (mode) {
            case 0: ecartBande = 5;
                break;
            case 1: ecartBande = 10;
                break;
            case 2: modeHistogramme = false;
                break;
            default: break;
        }

        let nbBandes = modeHistogramme ? 100 / ecartBande : 0;

        const fonctionHistogramme = (x) => {
            return Math.floor(x * nbBandes) / nbBandes !== Math.ceil(x * nbBandes) / nbBandes ?
                integrate((x) => betaFunction(x, a, b), Math.floor(x * nbBandes) / nbBandes, Math.ceil(x * nbBandes) / nbBandes) / ((Math.ceil(x * nbBandes) - Math.floor(x * nbBandes)) / nbBandes) * ecartBande
                : x !== 0 ? fonctionHistogramme(x - 0.001) : fonctionHistogramme(x + 0.001)
        }

        let values = [...Array(201).keys()].map(e => e / 2).map(x => ({ x: x, y: modeHistogramme ? fonctionHistogramme(x / 100) : betaFunction(x / 100, a, b) }));
        let integratedValues = [...Array(201).keys()].map(e => e / 2).map(x => ({ x: x, y: integrate((x) => betaFunction(x, a, b), 0, x / 100) }));

        let datasets = [
            values.filter(e => e.x / 100 < moyenne - ecartType),
            values.filter(e => e.x / 100 < moyenne && e.x / 100 >= moyenne - ecartType),
            values.filter(e => e.x / 100 > moyenne && e.x / 100 <= moyenne + ecartType),
            values.filter(e => e.x / 100 > moyenne + ecartType)
        ];

        datasets = datasets.map(e => typeof e[0] !== "undefined" ? [...[...Array(Math.round(e[0].x * 2)).keys()].map(s => null), ...e] : e);
        let datasetsColors = ["lightcoral", "lightpink", "lightgreen", "limegreen"];

        let data = {
            // labels: [...Array(101).keys()],
            datasets: [
                ...datasets.map((e, i) => ({
                    label: "Densité de probabilité",
                    lineTension: 0,
                    data: e,
                    borderColor: datasetsColors[i],
                    borderWidth: 0.1,
                    backgroundColor: datasetsColors[i],
                    pointRadius: 0,
                    showLine: true,
                    fill: true,
                })),
                {
                    label: "Votre moyenne",
                    data: [],
                    borderColor: theme.note,
                    fill: false
                },
            ]
        }

        let options = {
            scales: {
                yAxes: [{
                    scaleLabel: {
                        display: true,
                        labelString: modeHistogramme ? "Nombre d'étudiants en %" : "Densité d'étudiants en %",
                        fontSize: 12
                    }
                }],
                xAxes: [{
                    ticks: {
                        min: 0,
                        max: 100,
                        stepSize: 20,
                        // callback: function (value, index, values) {
                        //     if (value % 20 === 0)
                        //         return value;
                        //     return "";
                        // },
                    },
                    scaleLabel: {
                        display: true,
                        labelString: "Note de l'étudiant en %",
                        fontSize: 11.5
                    }
                }],
            },
            // hover: {
            //     mode: 'single'
            // },
            tooltips: {
                mode: 'index',
                intersect: false,
                displayColors: false,
                callbacks: {
                    title: (tooltipItems, data) => {
                        let hoverX = data.datasets[tooltipItems[0].datasetIndex].data[tooltipItems[0].index].x;
                        return modeHistogramme ?
                            `${100 * Math.floor(hoverX / 100 * nbBandes) / nbBandes !== 0 ? "]" : "["
                            }${100 * Math.floor(hoverX / 100 * nbBandes) / nbBandes !== 100 * Math.ceil(hoverX / 100 * nbBandes) / nbBandes || hoverX === 0
                                ? Math.round(100 * Math.floor(hoverX / 100 * nbBandes) / nbBandes) : Math.round(100 * Math.floor((hoverX - 0.01) / 100 * nbBandes) / nbBandes)} - ${Math.round(hoverX !== 0 ? 100 * Math.ceil(hoverX / 100 * nbBandes) / nbBandes :
                                    100 * Math.ceil((hoverX + 0.01) / 100 * nbBandes) / nbBandes)}] %`
                            : round1dec(hoverX) + "%";

                        // return round1dec(data.datasets[tooltipItems[tooltipItems.length - 1].datasetIndex].data[tooltipItems[0].xLabel].x) + "%";
                    },
                    label: (tooltipItem, data) => {
                        // let index = tooltipItem.index;
                        // let datasetIndex = tooltipItem.datasetIndex;
                        // let label = data.datasets[tooltipItem.datasetIndex].label || '';
                        // let value = data.datasets[datasetIndex].data[index];

                        return "Valeur: " + round2dec(values[Math.round(tooltipItem.xLabel * 2)].y) + "%";
                    },
                    afterBody: (tooltipItems, data) => {
                        let index = Math.round(tooltipItems[0].xLabel);
                        return "Somme: " + (index === 100 ? 100 : round2dec(integratedValues[index * 2].y * 100)) + "%";
                    }
                }
            },
            // title: {
            //     display: true,
            //     padding: 3,
            //     fontSize: 14.5,
            //     text: 'Densité de probabilité des notes'
            // },
            legend: {
                labels: {
                    boxWidth: 20,
                    filter: function (legendItem, chartData) {
                        return legendItem.datasetIndex > 3;
                        // return true or false based on legendItem's datasetIndex (legendItem.datasetIndex)
                    }
                }
            },
            annotation: {
                drawTime: "afterDatasetsDraw",
                annotations: [
                    // {
                    //     value: round2dec(toPercentage(valMoyTotale, denominateurTotal)),
                    //     borderWidth: 2,
                    //     borderColor: theme.moyenne,
                    // },
                    {
                        value: round2dec(toPercentage(valNoteTotale, denominateurTotal)),
                        borderWidth: 1,
                        borderColor: theme.note
                    },
                    ...[...Array(21).keys()].map(e => e * ecartBande).map(e => ({
                        value: e,
                        borderWidth: 2,
                        borderColor: "rgba(220,220,220,0.35)"
                    }))
                    // {
                    //     value: toPercentage((valMoyTotale - valEcartTypeTotal), denominateurTotal) > 0 ?
                    //         round2dec(toPercentage(valMoyTotale - valEcartTypeTotal, denominateurTotal)) : undefined,
                    //     borderWidth: 1,
                    //     borderColor: theme.ecartType,
                    // },
                    // {
                    //     value: toPercentage((valMoyTotale + valEcartTypeTotal), denominateurTotal) < 100 ?
                    //         round2dec(toPercentage(valMoyTotale + valEcartTypeTotal, denominateurTotal)) : undefined,
                    //     borderWidth: 1,
                    //     borderColor: theme.ecartType,
                    // }
                ].map(e => ({
                    type: "line",
                    mode: "vertical",
                    scaleID: "x-axis-1",
                    ...e
                }))
            },
            elements: {
                line: {
                    tension: 0
                }
            }
        };

        new Chart(elementHote, {
            type: 'scatter',
            data: data,
            options: options
        });

    }

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

    chrome.storage.sync.get(['theme', "modeGraphique"], function (arg) {
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
            legend: {
                labels: {
                    boxWidth: 15,
                }
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
            },
            annotation: {
                drawTime: "afterDatasetsDraw",
                annotations: [
                    {
                        value: 50,
                        borderWidth: 1,
                        borderColor: "dimgray"
                    },

                ].map(e => ({
                    type: "line",
                    mode: "horizontal",
                    scaleID: "y-axis-1",
                    ...e
                }))
            }
        };

        new Chart(document.getElementById('myChart'), {
            type: 'scatter',
            data: data,
            options: options
        });

        if (denominateurTotal >= 15) {
            let modeGraphique = 0;
            if (typeof arg.modeGraphique !== 'undefined') {
                modeGraphique = arg.modeGraphique;
            } else {
                chrome.storage.sync.set({ modeGraphique: modeGraphique });
            }

            const insererPredictionCote = () => {
                let cotesOrdonnees = infosCotes.slice(0).sort((a, b) => a.nombre - b.nombre)
                let note = round2dec(toPercentage(valNoteTotale, denominateurTotal));
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
                coteFinale.innerHTML = "Prédiction : " + cotePredite;
            }

            if (coteFinale.innerHTML == "  ") insererPredictionCote();

            setTimeout(() => {
                injecterGraphiqueDistribution(
                    document.getElementById('distributionBeta'),
                    round2dec(toPercentage(valMoyTotale, denominateurTotal)),
                    round2dec(toPercentage(valEcartTypeTotal, denominateurTotal)),
                    round2dec(toPercentage(valMedianeTotale, denominateurTotal)),
                    valRangCentileTotal,
                    round2dec(toPercentage(valNoteTotale, denominateurTotal)),
                    {
                        note: "dimgray"/* lightenOrDarkenColor(theme === "default-theme" ? "#4F7795" : "#B90E1C", 100) */,
                        courbe: theme === "default-theme" ? "#4F7795" : "#B90E1C",
                        moyenne: "lightgray",
                        ecartType: "whitesmoke"
                    }, modeGraphique
                );
            }, 50);

        }

        document.querySelector('#linksignetsplugin').setAttribute("style", `color:${theme === "default-theme" ? "#4F7795" : "#B90E1C"}; text-decoration: none;`);
    });

    // Régler un bug relié aux menus déroulants qui ne fonctionnent plus quand on ajoute un élément au menu de gauche
    // il faut injecter un script dans la page pour avoir accès à ses fonctions jquery à partir de notre content script qui est isolé
    injectScript(/*javascript*/`$('#menuElem').menu_toggle_adder();`);
}

const INDEX_MAITRISE = 8;

let infosProgrammes = [
    { sigle: "CUT", code: 5730, credits: 30 },
    { sigle: "CTN", code: 7625, credits: 117 },
    { sigle: "ELE", code: 7694, credits: 115 },
    { sigle: "LOG", code: 7084, credits: 116 },
    { sigle: "MEC", code: 7684, credits: 115 },
    { sigle: "GOL", code: 7495, credits: 114 },
    { sigle: "GPA", code: 7485, credits: 117 },
    { sigle: "GTI", code: 7086, credits: 116 },

    { sigle: "MGA", code: 3235, credits: 45 },
    { sigle: "MGA", code: 1560, credits: 45 },
    { sigle: "MPA", code: 3034, credits: 45 },
    { sigle: "MPA", code: 1566, credits: 45 },
    { sigle: "MGE", code: 3044, credits: 45 },
    { sigle: "MGE", code: 1564, credits: 45 },
    { sigle: "MGC", code: 1544, credits: 45 },
    { sigle: "MGC", code: 1543, credits: 45 },
    { sigle: "MTR", code: 3094, credits: 45 },
    { sigle: "MER", code: 1560, credits: 45 },
    { sigle: "MEN", code: 1562, credits: 45 },
    { sigle: "MEN", code: 1561, credits: 45 },
    { sigle: "MTR", code: 1560, credits: 45 },
    { sigle: "MTI", code: 1568, credits: 45 },
    { sigle: "MTI", code: 1567, credits: 45 },
    { sigle: "MGM", code: 3054, credits: 45 },
    { sigle: "MGM", code: 3059, credits: 45 },
    { sigle: "MGL", code: 1822, credits: 45 },
    { sigle: "MGL", code: 1560, credits: 45 }
];

let infosCotes = [
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
