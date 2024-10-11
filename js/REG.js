document.addEventListener('DOMContentLoaded', () => {
    let Login = document.querySelector('#login');
    let Emeil = document.querySelector('#Emeil');
    let Password = document.querySelector('#password');
    let button = document.querySelector('#reg');
    document.write('<script type="text/javascript" src="server.js"></script>');

    let users = {};

    function User(Login, Emeil, Password) {
        this.Login = Login;
        this.Emeil = Emeil;
        this.Password = Password;
    }

    function SetCookie(name,value){
        document.cookie = name+"="+value;
    }
    function createID(users) {
        return Object.keys(users).length;
    }

button.addEventListener('click', () => {
    if (Login.value === '' || Emeil.value === '' || Password.value === '') {
        alert('Пожалуйста, заполните все поля!');
        return;
    }

    const user = new User(Login.value, Emeil.value, Password.value);
    users['User' + createID(users)] = user;
    SetCookie('user', '1');
    SetCookie('Login', Login.value);
    SetCookie('Emeil', Emeil.value);
    SetCookie('Password', Password.value);
    console.log(users);
    alert(document.cookie);
});

});

