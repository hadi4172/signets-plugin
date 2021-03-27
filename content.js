window.onload = () => {

    chrome.storage.sync.get('notify', function (arg) {
        if (typeof arg.notify === 'undefined') {
            setTimeout(() => {
                alert("SIGNETS Plugin : Un nouveau thème a été rajouté pour le site. Pour l'essayer, cliquez sur l'icone du plugin dans votre barre de navigateur. :)");
                chrome.storage.sync.set({ notify: "theme" });
            }, 3000);
        }
    });

    // =========================================================================
    // Interface notes
    // =========================================================================
    if (window.location.href.includes(`signets-ens.etsmtl.ca/Secure/DetailsCoursGroupe`)) {
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

        const toSplit = (elem) => {
            return elem.innerHTML.replace(/ sur un maximum de /g, "/");
        }

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
        let valNoteTotale = getNumber(toSplit(noteTotale).split("/")[0]);
        let denominateurTotal = getNumber(toSplit(noteTotale).split("/")[1]);
        let valMoyTotale = getNumber(toSplit(noteGrpTotal).split("/")[0]);
        let rangCentileTotal = document.querySelector('#ctl00_ContentPlaceHolderMain_lesOnglets_tmpl0_txtRangCentile');

        let donneesGraphique = [];

        document.querySelector("#ctl00_LoginViewLeftColumn_MenuVertical").innerHTML += /*html*/`
        </br>
        <canvas id="myChart" width="250" height="250"></canvas>
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

        if (Math.floor(getNumber(noteTotale.innerHTML)) > Math.round(getNumber(noteGrpTotal.innerHTML))) {
            noteTotale.setAttribute("style", "background-color: lightgreen;");

            if (getNumber(noteTotale.innerHTML) > getNumber(noteGrpTotal.innerHTML) + getNumber(ecartTypeTotal.innerHTML))
                noteTotale.setAttribute("style", "background-color: limegreen;");

        } else if (Math.ceil(getNumber(noteTotale.innerHTML)) < Math.round(getNumber(noteGrpTotal.innerHTML))) {
            noteTotale.setAttribute("style", "background-color: lightpink;");

            if (getNumber(noteTotale.innerHTML) + getNumber(ecartTypeTotal.innerHTML) < getNumber(noteGrpTotal.innerHTML))
                noteTotale.setAttribute("style", "background-color: lightcoral;");

        } else if (denominateurTotal !== 0) {
            noteTotale.setAttribute("style", "background-color: lightgoldenrodyellow;");

        } else {
            noteTotale.setAttribute("style", "background-color: white;");
        }

        if (denominateurTotal !== 0) {
            noteTotale.innerHTML = `${toSplit(noteTotale)} (${round2dec(valNoteTotale / denominateurTotal * 100)}%)`;
            noteGrpTotal.innerHTML = `${toSplit(noteGrpTotal)} (${round2dec(valMoyTotale / denominateurTotal * 100)}%)`;
            ecartTypeTotal.innerHTML += `&ensp;${espacement}(${round2dec(getNumber(ecartTypeTotal.innerHTML) / denominateurTotal * 100)}%)`;
            medianeTotale.innerHTML += `${espacement}(${round2dec(getNumber(medianeTotale.innerHTML) / denominateurTotal * 100)}%)`;

            chrome.storage.sync.set({
                [session + cours]: [
                    rangCentileTotal.innerHTML,
                    noteTotale.style.backgroundColor,
                    round1dec(valNoteTotale / denominateurTotal * 100),
                    round1dec(valMoyTotale / denominateurTotal * 100)]
            });
            // console.log(`saved:`, `${session + cours}: ${[rangCentileTotal.innerHTML, noteTotale.style.backgroundColor, `${Math.round(valNoteTotale / denominateurTotal * 100)}%`]}`);
        }

        for (let i = 0; i < notesGrp.length; i++) {
            let noteEstRentre = notesGrp[i].innerHTML !== "&nbsp;";
            if (noteEstRentre && mesNotes[i].innerHTML === "&nbsp;") {
                mesNotes[i].innerHTML = 0;
                rangsCentiles[i].innerHTML = 0;
            }
            if (Math.floor(getNumber(mesNotes[i].innerHTML)) > Math.round(getNumber(notesGrp[i].innerHTML))) {
                mesNotes[i].parentNode.setAttribute("style", "background-color: lightgreen;");

                if (getNumber(mesNotes[i].innerHTML) > getNumber(notesGrp[i].innerHTML) + getNumber(ecartsTypes[i].innerHTML))
                    mesNotes[i].parentNode.setAttribute("style", "background-color: limegreen;");


            } else if (Math.ceil(getNumber(mesNotes[i].innerHTML)) < Math.round(getNumber(notesGrp[i].innerHTML))) {
                mesNotes[i].parentNode.setAttribute("style", "background-color: lightpink;");

                if (getNumber(mesNotes[i].innerHTML) + getNumber(ecartsTypes[i].innerHTML) < getNumber(notesGrp[i].innerHTML))
                    mesNotes[i].parentNode.setAttribute("style", "background-color: lightcoral;");


            } else {
                if (noteEstRentre) {
                    mesNotes[i].parentNode.setAttribute("style", "background-color: lightgoldenrodyellow;");
                }
            }
            // console.log(mesNotes[i].parentNode);
            mesNotes[i].style.fontWeight = "bold";
            notesGrp[i].style.fontWeight = "bold";

            if (noteEstRentre) {
                let maNoteEnPourcentage = getNumber(mesNotes[i].innerHTML) / getNumber(denominateurs[i].innerHTML) * 100;
                let noteGrpEnPourcentage = getNumber(notesGrp[i].innerHTML) / getNumber(denominateurs[i].innerHTML) * 100;
                let ponderation = getNumber(ponderations[i].innerHTML);
                donneesGraphique.push([maNoteEnPourcentage, noteGrpEnPourcentage, ponderation]);

                mesNotes[i].innerHTML += /*html*/` <span style="font-weight: normal;">(${Math.round(maNoteEnPourcentage)}%)</span>`;
                notesGrp[i].innerHTML += /*html*/` <span style="font-weight: normal;">(${Math.round(noteGrpEnPourcentage)}%)</span>`;
                medianes[i].innerHTML += /*html*/` <span style="font-weight: normal;">(${Math.round(getNumber(medianes[i].innerHTML) / getNumber(denominateurs[i].innerHTML) * 100)}%)</span>`;
                ponderations[i].innerHTML += /*html*/`</br>(${round2dec(getNumber(ponderations[i].innerHTML) * maNoteEnPourcentage / 100)})`;
                ecartsTypes[i].innerHTML += ` (${Math.round(getNumber(ecartsTypes[i].innerHTML) / getNumber(denominateurs[i].innerHTML) * 100)}%)`;
            }

        }

        console.log(`donneesGraphique:`, donneesGraphique);

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
                y: i !== donneesGraphique.length - 1 ? round1dec(getSum(donneesGraphique.map(x2 => x2[1] * x2[2]).slice(0, i + 1)) / pourcentageNote) : round1dec(valMoyTotale / denominateurTotal * 100),
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

            var options = {
                scales: {
                    yAxes: [{
                        ticks: {
                            suggestedMin: 60,
                            suggestedMax: 100
                        },
                        scaleLabel: {
                            display: true,
                            labelString: 'Moyenne en %',
                            fontSize: 11.5
                        }
                    }],
                    xAxes: [{
                        ticks: {
                            max: 100
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
                        label: function (tooltipItem, data) {
                            let index = tooltipItem.index;
                            let datasetIndex = tooltipItem.datasetIndex;
                            // let label = data.datasets[tooltipItem.datasetIndex].label || '';
                            let value = data.datasets[datasetIndex].data[index];
                            return value.y + "%";
                        }
                    }
                }
            };

            new Chart(document.getElementById('myChart'), {
                type: 'scatter',
                data: data,
                options: options
            });

            document.querySelector('#linksignetsplugin').setAttribute("style", `color:${theme === "default-theme" ? "#4F7795" : "#B90E1C"};text-decoration: none;`);
        });
        
        //Régler un bug que les développeurs de SIGNETS ont laissé
        let menusDeroulants = Array.from(document.querySelectorAll('.AspNet-Menu-WithChildren.CMSListMenuLI'));

        for (let menuDeroulant of menusDeroulants) {
            let lien = menuDeroulant.querySelector('a');
            lien.removeAttribute("href");
            menuDeroulant.addEventListener("click", function () {
                let contenu = menuDeroulant.querySelector('ul');
                if (contenu.getAttribute("style") !== "") {
                    contenu.setAttribute("style", "");
                    lien.setAttribute("class", "toggledBack");
                }
                else {
                    contenu.setAttribute("style", "display: none;");
                    lien.setAttribute("class", "togglerBack");
                }
            });
        }

        // =====================================================================
        // Interface cours
        // =====================================================================
    } else if (window.location.href.includes(`https://signets-ens.etsmtl.ca/Secure/MesNotes`) || window.location.href === "https://signets-ens.etsmtl.ca/") {
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

        let afficherRangCentile = () => {
            console.log(`Affiché rang centile`);
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

            for (let session of sessions) {
                let rangCentilesCours = Array.from(session.parentNode.nextSibling.querySelectorAll('[aria-describedby*="_columnheader_6"]'));
                let noteCours = Array.from(session.parentNode.nextSibling.querySelectorAll('[aria-describedby*="_columnheader_5"]'));
                let siglesCours = Array.from(session.parentNode.nextSibling.querySelectorAll('[aria-describedby*="_columnheader_2"]')).map(x => x.textContent.split("-")[0]);

                let donneesGraphique = [];  //structure : [[sigle,note,moyenne],[sigle,note,moyenne],...]

                for (let i = 0, length = rangCentilesCours.length; i < length; i++) {

                    if (noteCours[i].innerHTML === "K") noteCours[i].parentNode.setAttribute("style", `background-color: lightblue;`);

                    let cle = `${session.innerHTML.replace(/ /g, "")}${siglesCours[i]}`;

                    chrome.storage.sync.get([cle, 'theme', 'showGrades'], function (arg) {
                        let theme = "default-theme";
                        if (typeof arg.theme !== 'undefined') {
                            theme = arg.theme;
                        }
                        if (typeof arg[cle] !== 'undefined' && !isNaN(parseInt(arg[cle]))) {
                            rangCentilesCours[i].innerHTML = arg[cle][0];
                            rangCentilesCours[i].style.color = "black";
                            rangCentilesCours[i].style.userSelect = "auto";
                            rangCentilesCours[i].parentNode.setAttribute("style", `background-color: ${arg[cle][1]};`);
                            if (noteCours[i].innerHTML === "" && arg[cle][1] !== "white" && arg[cle][2]) noteCours[i].innerHTML = typeof arg[cle][2] === "string" ? arg[cle][2] : `${arg[cle][2]}%`;
                            if (typeof arg.showGrades !== 'undefined' && arg.showGrades === true && noteCours[i].innerHTML !== "" && !noteCours[i].innerHTML.includes("%")) {
                                noteCours[i].innerHTML += ` | ${arg[cle][2]}%`;
                                noteCours[i].style.whiteSpace = "nowrap";
                            }
                            donneesGraphique.push([siglesCours[i], typeof arg[cle][2] === "string" ? parseInt(arg[cle][2]) : arg[cle][2], typeof arg[cle][3] !== 'undefined' ? arg[cle][3] : 0]);
                        } else {
                            if (rangCentilesCours[i].style.color !== "black") rangCentilesCours[i].style.color = "transparent";
                            if (rangCentilesCours[i].style.userSelect !== "auto") rangCentilesCours[i].style.userSelect = "none";

                            donneesGraphique.push([siglesCours[i], 0, 0]);
                        }

                        if (donneesGraphique.some(x => x[1] !== 0 || x[2] !== 0) && !sessionsAvecGraphiqueActive.includes(cle) && i == length - 1) {
                            console.log(`Entre graphique`);
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
                                        itemSort: function (a, b) {
                                            return b.yLabel - a.yLabel
                                        },
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
        }

        afficherRangCentile();


        setTimeout(() => {
            for (let expandButton of expandButtons) {
                if (expandButton.getAttribute("alt") === "Expand Row") expandButton.click();
            }
            afficherRangCentile();
        }, 100);

    }
};

function getNumber(elem) {
    return parseFloat(vToP(elem));
}

function vToP(string) {
    return string.replace(/,/g, ".");
}

function round2dec(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
}

function round1dec(num) {
    return Math.round((num + Number.EPSILON) * 10) / 10;
}

function injectCSS(css) {
    let style = document.createElement('style');
    style.setAttribute('id', 'signets-plugin-style');
    style.type = 'text/css';
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
    return style;
}

function getSum(arr) {
    return arr.reduce((a, b) => a + b, 0);
}