// Facebook JS SDK Integration (loads only when needed)
if (window.location.search.includes('fbsdk=1')) {
    fetch('/auth/facebook/config')
        .then(res => res.json())
        .then(config => {
            window.fbAsyncInit = function() {
                FB.init({
                    appId: config.appId,
                    cookie: true,
                    xfbml: true,
                    version: 'v18.0'
                });
                
                FB.AppEvents.logPageView();
            };
        });
}

(function(d, s, id){
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) {return;}
    js = d.createElement(s); js.id = id;
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));

// Facebook Login Handler (fallback only)
function loginWithFacebookSDK() {
    FB.login(function(response) {
        if (response.authResponse) {
            const { accessToken, userID } = response.authResponse;
            
            fetch('/auth/facebook/sdk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken, userID })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    window.location.href = '/';
                } else {
                    alert('Login failed: ' + (data.error || 'Unknown error'));
                }
            })
            .catch(err => {
                console.error('Facebook login error:', err);
                alert('Login failed');
            });
        }
    }, {scope: 'public_profile,email'});
}

// Check if SDK fallback is needed
if (window.location.search.includes('fbsdk=1')) {
    window.loginWithFacebook = loginWithFacebookSDK;
} else {
    window.loginWithFacebook = function() {
        window.location.href = '/auth/facebook';
    };
}
