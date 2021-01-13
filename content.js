window.onload = () => {
    if (window.location.href.includes(`signets-ens.etsmtl.ca/Secure/DetailsCoursGroupe`)) {
        console.log(`[Interface notes]`);
        injectCSS(/*css*/`
        td{
            background-color:inherit !important;
        }
        
        .igtab_Office2010BlueTHContent{
            overflow:auto!important;
        }`);

        const toSplit = (elem) => {
            return elem.innerHTML.replace(/ sur un maximum de /g, "/");
        }

        let session = document.querySelector('#ctl00_ContentPlaceHolderMain_txtTrimestre1').innerHTML.replace(/ /g, "");
        let cours = document.querySelector('#ctl00_ContentPlaceHolderMain_txtSigle1').innerHTML;

        let grosConteneur = document.querySelector('.igtab_Office2010BlueTHContentHolder');
        grosConteneur.style.height = "";   // to auto resize height

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


        if (Math.round(getNumber(noteTotale.innerHTML)) > Math.round(getNumber(noteGrpTotal.innerHTML))) {
            noteTotale.setAttribute("style", "background-color: lightgreen;");

            if (getNumber(noteTotale.innerHTML) > getNumber(noteGrpTotal.innerHTML) + getNumber(ecartTypeTotal.innerHTML))
                noteTotale.setAttribute("style", "background-color: limegreen;");

        } else if (Math.round(getNumber(noteTotale.innerHTML)) < Math.round(getNumber(noteGrpTotal.innerHTML))) {
            noteTotale.setAttribute("style", "background-color: lightpink;");

            if (getNumber(noteTotale.innerHTML) + getNumber(ecartTypeTotal.innerHTML) < getNumber(noteGrpTotal.innerHTML))
                noteTotale.setAttribute("style", "background-color: lightcoral;");

        } else if (denominateurTotal !== 0) {
            noteTotale.setAttribute("style", "background-color: lightgoldenrodyellow;");

        } else {
            noteTotale.setAttribute("style", "background-color: white;");
        }

        chrome.storage.sync.set({ [session + cours]: [rangCentileTotal.innerHTML, noteTotale.style.backgroundColor] });
        console.log(`saved:`, `${session + cours}: ${[rangCentileTotal.innerHTML, noteTotale.style.backgroundColor]}`);

        if (denominateurTotal !== 0) {

            noteTotale.innerHTML = `${toSplit(noteTotale)} (${round2dec(valNoteTotale / denominateurTotal * 100)}%)`;
            noteGrpTotal.innerHTML = `${toSplit(noteGrpTotal)} (${round2dec(valMoyTotale / denominateurTotal * 100)}%)`;
            ecartTypeTotal.innerHTML += `&ensp;${espacement}(${round2dec(getNumber(ecartTypeTotal.innerHTML) / denominateurTotal * 100)}%)`;
            medianeTotale.innerHTML += `${espacement}(${round2dec(getNumber(medianeTotale.innerHTML) / denominateurTotal * 100)}%)`;
        }

        for (let i = 0; i < notesGrp.length; i++) {
            let noteEstRentre = notesGrp[i].innerHTML !== "&nbsp;";
            if (noteEstRentre && mesNotes[i].innerHTML === "&nbsp;") {
                mesNotes[i].innerHTML = 0;
                rangsCentiles[i].innerHTML = 0;
            }
            if (Math.round(getNumber(mesNotes[i].innerHTML)) > Math.round(getNumber(notesGrp[i].innerHTML))) {
                mesNotes[i].parentNode.setAttribute("style", "background-color: lightgreen;");

                if (getNumber(mesNotes[i].innerHTML) > getNumber(notesGrp[i].innerHTML) + getNumber(ecartsTypes[i].innerHTML))
                    mesNotes[i].parentNode.setAttribute("style", "background-color: limegreen;");


            } else if (Math.round(getNumber(mesNotes[i].innerHTML)) < Math.round(getNumber(notesGrp[i].innerHTML))) {
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
                mesNotes[i].innerHTML += ` <span style="font-weight: normal;">(${Math.round(maNoteEnPourcentage)}%)</span>`;
                notesGrp[i].innerHTML += ` <span style="font-weight: normal;">(${Math.round(getNumber(notesGrp[i].innerHTML) / getNumber(denominateurs[i].innerHTML) * 100)}%)</span>`;
                medianes[i].innerHTML += ` <span style="font-weight: normal;">(${Math.round(getNumber(medianes[i].innerHTML) / getNumber(denominateurs[i].innerHTML) * 100)}%)</span>`;
                ponderations[i].innerHTML += `</br>(${round2dec(getNumber(ponderations[i].innerHTML) * maNoteEnPourcentage / 100)})`;
                ecartsTypes[i].innerHTML += ` (${Math.round(getNumber(ecartsTypes[i].innerHTML) / getNumber(denominateurs[i].innerHTML) * 100)}%)`;
            }

        }
    } else if (window.location.href.includes(`https://signets-ens.etsmtl.ca/Secure/MesNotes`) || window.location.href === "https://signets-ens.etsmtl.ca/") {
        console.log(`[Interface cours]`);
        let expandButtons = Array.from(document.querySelectorAll('[mkr="expColBtn"]'));

        injectCSS(/*css*/`
        td{
            background-color:inherit !important;
        }
        
        .igtab_Office2010BlueTHContent{
            overflow:auto!important;
        }`);

        let afficherRangCentile = () => {
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
                for (let rangCentile of rangCentilesCours) {
                    let cle = `${session.innerHTML.replace(/ /g, "")}${rangCentile.innerHTML.replace(/ /g, "")}`;
                    chrome.storage.sync.get(cle, function (arg) {
                        if (typeof arg[cle] !== 'undefined' && !isNaN(parseInt(arg[cle]))) {
                            rangCentile.innerHTML = arg[cle][0];
                            rangCentile.style.color = "black";
                            rangCentile.style.userSelect = "auto";
                            rangCentile.parentNode.setAttribute("style", `background-color: ${arg[cle][1]};`);
                        } else {
                            if (rangCentile.style.color !== "black") rangCentile.style.color = "white";
                            if (rangCentile.style.userSelect !== "auto") rangCentile.style.userSelect = "none";
                        }
                    });
                }
            }
        }

        afficherRangCentile();

        for (let expandButton of expandButtons) {
            setTimeout(() => {
                if (expandButton.getAttribute("alt") === "Expand Row") expandButton.click();
            }, 100);

            expandButton.addEventListener("click", function () {
                setTimeout(() => {
                    afficherRangCentile();
                }, 50);
            });
        }
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

function injectCSS(css) {
    let style = document.createElement('style');
    style.setAttribute('id', 'signets-plugin-style');
    style.type = 'text/css';
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
}