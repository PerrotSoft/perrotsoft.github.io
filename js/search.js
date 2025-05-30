document.querySelector('#searchText').oninput = function () {
    let val = this.value.trim().toLowerCase();
    let elasticItems = document.querySelectorAll('.search li');

    elasticItems.forEach(function (elem) {
        let text = elem.innerText.toLowerCase();
        if (val !== '' && text.includes(val)) {
            elem.classList.remove('hide');
        } else {
            elem.classList.add('hide');
        }
    });
}
document.querySelector('#searchText').oninput = function () {
    let val = this.value.trim();
    let elasticItems = document.querySelectorAll('.search li')
    elasticItems.forEach(function (elem) {
        elem.classList.add('hide');
    });
    if (val != '') {
        elasticItems.forEach(function (elem) {
            if (elem.innerText.search(val) == -1) {
            elem.classList.add('hide');
            }
            else {
            elem.classList.remove('hide');
            }
        });
    }
    else {
        elasticItems.forEach(function (elem) {
            elem.classList.add('hide');
        });
    }
}