import Script from 'next/script';

export function ChatwootWidgetComponent() {
    return (
        <Script id="chatwoot-init" strategy="afterInteractive">
            {`
                window.chatwootSettings = {"position":"right","type":"standard","launcherTitle":"Chatten Sie mit uns"};
                (function(d,t){
                    var BASE_URL="https://support.isntfunny.de";
                    var g=d.createElement(t),s=d.getElementsByTagName(t)[0];
                    g.src=BASE_URL+"/packs/js/sdk.js";
                    g.defer=true;g.async=true;
                    s.parentNode.insertBefore(g,s);
                    g.onload=function(){window.chatwootSDK.run({websiteToken:"dLTD67hVUwRWU9TRVstPsjBD",baseUrl:BASE_URL})}
                })(document,"script");
            `}
        </Script>
    );
}
