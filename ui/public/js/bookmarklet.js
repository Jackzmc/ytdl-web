var a = prompt("Please enter an URL",window.location);
if(!/(http(s)?:\/\/)?(www.)?(?:youtube\.com\/\S*(?:(?:\/e(?:mbed))?\/|watch\?(?:\S*?&?v=))|youtu\.be\/)([a-zA-Z0-9_-]{6,11})/.test(a)) {
    alert('Invalid url. Must be a youtube.com/watch?v= or youtu.be/ url.')
}else{
    window.location.href = "https://ytdl.jackz.me/#" + a;
}
