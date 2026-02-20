




export function register(config) {
  if ('serviceWorker' in navigator) {
    const swUrl = '/sw.js';

    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        console.log('SW registrado');
    
        registration.onupdatefound = () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.onstatechange = () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                config?.onUpdate?.(registration);
              } else {
                console.log('Cache para para uso offline.');
                //config?.onSuccess?.(registration);
                config?.onUpdate?.(registration);
              }
            }
          };
        };

        
        //procura update
        setInterval(() => {
          registration.update();
        }, 10000);
      })
      .catch((err) => {
        console.error('Falha ao registrar SW', err);
      });
  }
}
