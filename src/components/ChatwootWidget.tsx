import Script from 'next/script';

interface ChatwootUser {
    id: string;
    name?: string;
    email?: string;
    identifierHash?: string;
}

interface ChatwootWidgetProps {
    user?: ChatwootUser | null;
}

export function ChatwootWidgetComponent({ user }: ChatwootWidgetProps) {
    const userScript = user
        ? `
                window.addEventListener('chatwoot:ready', function() {
                    window.$chatwoot.setUser(${JSON.stringify(user.id)}, {
                        ${user.name ? `name: ${JSON.stringify(user.name)},` : ''}
                        ${user.email ? `email: ${JSON.stringify(user.email)},` : ''}
                        ${user.identifierHash ? `identifier_hash: ${JSON.stringify(user.identifierHash)},` : ''}
                    });
                });`
        : '';

    return (
        <Script id="chatwoot-init" strategy="afterInteractive">
            {`
                window.chatwootSettings = {"position":"right","type":"standard","launcherTitle":"Chatten Sie mit uns"};
                (function(d,t){
                    var BASE_URL="https://support.tecfriends.de";
                    var g=d.createElement(t),s=d.getElementsByTagName(t)[0];
                    g.src=BASE_URL+"/packs/js/sdk.js";
                    g.defer=true;g.async=true;
                    s.parentNode.insertBefore(g,s);
                    g.onload=function(){window.chatwootSDK.run({websiteToken:"dLTD67hVUwRWU9TRVstPsjBD",baseUrl:BASE_URL})}
                })(document,"script");
                ${userScript}
            `}
        </Script>
    );
}
