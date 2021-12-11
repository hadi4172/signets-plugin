window.onload = function () {
    let checkboxNoColors = document.querySelector("#disablecolors");
    let checkboxGPAInNumber = document.querySelector("#gpainnumber");
    let checkboxShowGrades = document.querySelector("#alwaysshowgrades");
    let checkboxPreciseGrades = document.querySelector("#precisegrades");
    let radioThemes = Array.from(document.querySelectorAll('[name="theme"]'));
    let estimerCoteBtn = document.querySelector("#btn-estimer-cote");

    chrome.storage.sync.get(['noColors', 'showGrades', 'theme', 'preciseGrades', 'gpaInNumber'], function (arg) {
        checkboxNoColors.checked = false;
        if (typeof arg.noColors !== 'undefined') {
            if (arg.noColors === true) checkboxNoColors.checked = true;
        }

        checkboxGPAInNumber.checked = false;
        if (typeof arg.gpaInNumber !== 'undefined') {
            if (arg.gpaInNumber === true) checkboxGPAInNumber.checked = true;
        }

        checkboxShowGrades.checked = false;
        if (typeof arg.showGrades !== 'undefined') {
            if (arg.showGrades === true) checkboxShowGrades.checked = true;
        }

        checkboxPreciseGrades.checked = false;
        if (typeof arg.preciseGrades !== 'undefined') {
            if (arg.preciseGrades === true) checkboxPreciseGrades.checked = true;
        }

        if (typeof arg.theme !== 'undefined') {
            for (let radioTheme of radioThemes) {
                if (radioTheme.getAttribute("value") === arg.theme) radioTheme.checked = true;
            }
        } else {
            chrome.storage.sync.set({ theme: "default-theme" });
            radioThemes[0].checked = true;
        }

    });
    checkboxNoColors.addEventListener("click", function () {
        chrome.storage.sync.set({ noColors: checkboxNoColors.checked });
    });

    checkboxGPAInNumber.addEventListener("click", function () {
        chrome.storage.sync.set({ gpaInNumber: checkboxGPAInNumber.checked });
    });

    checkboxShowGrades.addEventListener("click", function () {
        chrome.storage.sync.set({ showGrades: checkboxShowGrades.checked });
    });

    checkboxPreciseGrades.addEventListener("click", function () {
        chrome.storage.sync.set({ preciseGrades: checkboxPreciseGrades.checked });
    });

    for (let radioTheme of radioThemes) {
        radioTheme.addEventListener("click", function () {
            chrome.storage.sync.set({ theme: radioTheme.getAttribute("value") });
        });
    }

    estimerCoteBtn.addEventListener("click", function () {
        chrome.windows.create({ 'url': 'estimerCote.html', 'type': 'popup', 'width': 300, 'height': 190 }, function (window) {
        });
    });

};