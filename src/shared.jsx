import { Alert, Box, Button, createTheme, Dialog, DialogActions, DialogContent, DialogTitle, Grid, List, ListItem, Paper, responsiveFontSizes, Stack, TextField, Typography } from '@mui/material';
import { useState, useEffect, useRef } from 'react';
import s_img from './assets/s_img.png';
import { useCanInstallPwa, usePwaInstall } from './utils/usePwaInstall';
import { useDialogs } from '@toolpad/core';
//import { get, save } from './utils/indexDB';
import { addDocumentId, getDocumentById, SYS_ORDER_STATUS, updateDocument, updateDocumentsBatch, useAuthUser, useWtrUser } from './api';
import { arrayUnion, Timestamp } from 'firebase/firestore';
import { useParams } from 'react-router';

import { useData } from './context';



export function CustomerDialog({ open, onClose }) {
  const [result, setResult] = useState('');
  const params = useParams();
  const { user } = useAuthUser();

  const handleSaveCustomer = async () => {
    if (!result) return onClose(null);

    const customer = await getDocumentById(params.merchantId, 'customer', user.uid);

    if (customer) {
      await updateDocument(params.merchantId, 'customer', customer.customerId, { name: result });
    } else {
      await addDocumentId(params.merchantId, 'customer', { name: result }, user.uid);
    }

    onClose(result);

  }



  return (
    <Dialog fullWidth open={open} onClose={() => onClose(null)}>
      <DialogTitle>Como quer ser chamado?</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin='dense'
          size='small'
          label='Nome'
          fullWidth
          value={result}
          onChange={(event) => setResult(event.currentTarget.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleSaveCustomer}>Ok</Button>
      </DialogActions>
    </Dialog>
  );
}



export function ErrorDialog({ open, onClose, payload }) {
  return (
    <Dialog fullWidth open={open} onClose={() => onClose()}>
      <DialogTitle>Erro</DialogTitle>
      <DialogContent>
        <Alert severity='error'>
          <Box whiteSpace='pre-line'>
            {payload.textError}
          </Box>
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose()}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}





export function HelpDialog({ open, onClose }) {
  const [result, setResult] = useState('');
  const { user } = useAuthUser();
  const dialogs = useDialogs();
  const [customer, setCustomer] = useState(null);
  const params = useParams();

  const handleSaveCustomer = async () => {
    const name = await dialogs.open(CustomerDialog);

    setCustomer({ name });
  }

  useEffect(() => {
    if (!user) return

    (async () => {
      const data = await getDocumentById(params.merchantId, 'customer', user.uid);
      setCustomer(data);
    })();
  }, [user]);

  return (
    <Dialog fullWidth open={open} onClose={() => onClose(null)}>
      <DialogTitle>Solicitar ajuda do garçom</DialogTitle>
      <DialogContent>

        <Grid container spacing={1}>
          <Button
            sx={{
              textTransform: 'none'
            }}
            onClick={handleSaveCustomer}
          >
            <Typography color='text.secondary' variant='body2'
              sx={{
                textDecoration: 'underline',
                color: 'primary'
              }}
            >
              {`Olá, ${customer?.name || 'Identifique-se'}`}
            </Typography>
          </Button>



          <TextField
            autoFocus
            multiline
            rows={4}
            margin='dense'
            size='small'
            label='Informe'
            fullWidth
            value={result?.text}
            onChange={(event) => {
              setResult({ text: event.target.value, customer: customer ?? { name: 'N/I' } })
            }}
          />
        </Grid>

      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(result)}>Ok</Button>
      </DialogActions>
    </Dialog>
  );
}


export function HelpOkDialog({ payload, open, onClose }) {

  const { claims } = useWtrUser();

  const { tableId, customer, text, callback } = payload;

  const { data } = useData();
  
  useEffect(() => {
    if (open) {
      const isStillValid = data.wtr.help.some(
        (h) => h.helpId === payload.helpId && h.status === 'OPEN'
      );
      if (!isStillValid) {
        onClose();
      }
    }
  }, [data.wtr.help, open, onClose, payload.helpId]);

  const handleOK = async () => {
    await updateDocument(claims?.merchantId, 'help', payload.helpId, {
      status: 'CLOSE',
      updatedAt: new Date(),
      claims
    })
    callback();
    onClose();
  }


  return (
    <Dialog fullWidth disableEscapeKeyDown open={open} onClose={(event, reason) => {
      if (reason !== 'backdropClick') {
        onClose();
      }
    }}>
      <DialogTitle>Pedido de ajuda</DialogTitle>
      <DialogContent>
        <Typography>
          {`Mesa ${tableId}`}
        </Typography>
        <Typography>
          {`${customer?.name || 'Consumidor'}`}
        </Typography>
        <Typography>
          {`${text}`}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button color='warning' onClick={() => {
          onClose();
        }}
        >
          Sair
        </Button>
        <Button color='error' onClick={() => {
          handleOK();
        }}
        >
          Atendido
        </Button>
      </DialogActions>
    </Dialog>
  );
}



export function CheckoutOkDialog({ payload, open, onClose }) {

  const { claims } = useWtrUser();

  //REVER (tudo em um lote)
  const handleOK = async () => {

    await updateDocument(claims?.merchantId, 'checkout', payload.checkoutId, {
      status: 'CLOSE',
      updatedAt: new Date(),
      claims
    })

    const status = SYS_ORDER_STATUS.find(s => s.id === 'CON');

    const order = {
      status: status.id,
      status_hist: arrayUnion({
        ...status,
        createdAt: Timestamp.now(),
        email: 'WTR'
      }),
      checkout: {
        ...claims
      }
    }

    const ordersToUpdate = payload.consumo.flatMap((c) => c.customers).flatMap(i => i.items);

    const documentsIds = ordersToUpdate.map(item => item.orderId);

    const result = await updateDocumentsBatch(claims.merchantId, 'order', documentsIds, order);

    console.log('result', result);

    onClose();
  }


  return (
    <Dialog fullWidth open={open} onClose={() => onClose()}>
      <DialogTitle>Fechar a conta</DialogTitle>
      <DialogContent>

        <Grid container>
          {payload.consumo
            .map(row => (
              <Grid key={row.table.tableId} size={{ xs: 12 }}>
                {row.customers
                  .map(row => (
                    <Paper key={row.customer.uid} variant='outlined' sx={{ pl: 0.5, pr: 0.5, mb: 2 }}>
                      <Typography variant='button' color='text.primary'>
                        {`${row.customer.name}`}
                      </Typography>

                      <List
                        sx={{
                          maxHeight: '75vh',
                          overflowY: 'auto'
                        }}
                      >
                        {row.items
                          .map((row) => (
                            <ListItem key={row.orderId} disablePadding sx={{ mb: 0.5 }}>
                              <Box display={'flex'} flexDirection={'column'} width={'100%'} justifyItems={'center'}>

                                <Paper variant='outlined' elevation={0} sx={{ p: 1 }}>
                                  <Stack flexGrow={1}>
                                    <Stack direction='row' flexGrow={1} justifyContent='space-between'>
                                      <Typography variant='body1' color='text.primary'>
                                        {`${row.name}`}
                                      </Typography>
                                      <Typography variant='body1' color='text.primary'>
                                        {`${row.qty_order} un x ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.price.value)}`}
                                      </Typography>
                                    </Stack>

                                    {!!row.options_selected?.length &&
                                      <Grid mt={1}>
                                        {row.options_selected.map((o) => (
                                          <Stack key={o.optionId} direction='row' flexGrow={1} justifyContent='space-between'>
                                            <Typography variant='body2'>
                                              {`+ ${o.name}`}
                                            </Typography>
                                            <Typography variant='body2'>
                                              {`${o.count} un x ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(o.price.value)}`}
                                            </Typography>
                                          </Stack>
                                        ))}
                                      </Grid>
                                    }
                                  </Stack>
                                </Paper>


                              </Box>
                            </ListItem>
                          ))}
                      </List>
                    </Paper>


                  ))}
              </Grid>
            ))
          }
        </Grid >


      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>SAIR</Button>
        <Button onClick={handleOK} color='error' variant='contained'>CONFIRMAR</Button>
      </DialogActions>
    </Dialog>
  );
}




export const ProductImage = ({ imagePath, alt, w, h }) => {
  const [src, setSrc] = useState(s_img);

  useEffect(() => {
    if (imagePath) {
      setSrc(imagePath);
    }
  }, [imagePath]);

  return (
    /*  <img
       src={src}
       alt={alt}
       loading='lazy'
       width='150px'
       onError={() => setSrc(s_img)}
       style={{ borderRadius: '8px' }}
     /> */
    <img
      src={src}
      alt={alt}
      //loading='lazy'
      onError={() => setSrc(s_img)}
      style={{
        //width: '100%',
        //maxWidth: w,
        width: w,
        //maxHeight: h,
        height: h,
        objectFit: 'contain',
        borderRadius: '8px'
      }}
    />
  );
};

export default ProductImage;





/* 
const useDataFetcher = () => {
  const { setData } = useData();
  const { loading, claims } = useAuthUser();
  const [error, setError] = React.useState(null);
  const [fetching, setFetching] = React.useState(loading);

  React.useEffect(() => {
    if (loading || !claims?.merchantId) return;

    const unsubscribe = fetchCollection(
      claims.merchantId,
      'table',
      null,
      (data) => {
        const range = data.length ? data[0] : { numStart: 0, numEnd: 0 };

        setData((prev) => ({
          ...prev,
          mnt: {
            ...prev.mnt,
            table: range,
          },
        }));

        setFetching(false);
      },
      (err) => {
        setError(err);
        setFetching(false);
      }
    );

    return () => unsubscribe();
  }, [loading, claims, setData]);

  return { fetching: loading || fetching, error, claims };
}; */


export function InstallPwaButton() {
  const { canInstall, promptInstall } = usePwaInstall();
  console.log('canInstall', canInstall)


  const manifest = useCanInstallPwa();
  console.log('manifest', manifest);

  if (!canInstall) return null;

  return (
    <Button variant='contained' onClick={promptInstall}>
      Instalar app
    </Button>
  );
}




export function QRCameraScanner() {
  const videoRef = useRef(null);
  const [message, setMessage] = useState('Aponte para o QR Code da mesa');

  useEffect(() => {
    let stream;

    const startScanner = async () => {
      if (!('BarcodeDetector' in window)) {
        setMessage('API ausente nesse navegador.');
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        videoRef.current.srcObject = stream;

        const detector = new BarcodeDetector({ formats: ['qr_code'] });

        const scan = async () => {
          if (!videoRef.current) return;
          const codes = await detector.detect(videoRef.current);
          if (codes.length) {
            const value = codes[0].rawValue;

            try {
              const url = new URL(value);
              if (url.protocol === 'http:' || url.protocol === 'https:') {
                window.location.href = url.href;
              } else {
                setMessage(`QR detectado mas não é um link: ${value}`);
              }
            } catch {
              setMessage(`QR detectado mas não é um link válido: ${value}`);
            }

            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          requestAnimationFrame(scan);
        };

        scan();
      } catch (err) {
        console.error(err);
        setMessage('Erro ao acessar a cam..');
      }
    };

    startScanner();

    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <Grid container direction={'column'} justifyContent={'center'} justifyItems={'center'} alignContent={'center'}>
      <video ref={videoRef} autoPlay playsInline style={{ width: '100%', maxWidth: 400, backgroundColor: 'lightgray' }} />
      <Typography textAlign={'center'}>{message}</Typography>
    </Grid>
  );
}





export const theme = responsiveFontSizes(
 createTheme({
    cssVariables: {
      colorSchemeSelector: 'data-toolpad-color-scheme',
    },
    // Removi a 'palette' de nível superior
    // Em vez de 'colorSchemes: { light: true, dark: true }',
    // defini as paletas para cada modo:
    colorSchemes: {
      light: {
        palette: {
          //paleta original para o MODO CLARO
          primary: {
            main: '#9F232B',
          },
          secondary: {
            main: '#0c3f6bff',
          },
          //defini fundos também
          background: {
            default: '#ffffffff',
            paper: '#ffffffff',
          }
        },
      },
      dark: {
        palette: {
          //paleta para o MODO ESCURO
          primary: {
            main: '#9F232B', // cor primária permanece
          },
          secondary: {
            main: '#82B1FF', // um azul mais claro e diferente
          },
          background: {
            default: '#252525ff', // fundo escuro padrão
            paper: '#1E1E1E',   // fundo de componentes
          },
          text: {
            primary: '#FFFFFF',
            secondary: '#BDBDBD',
          }
        },
      },
    },
  })
);