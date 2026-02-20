import {
  Alert,
  Box, Button, Grid, LinearProgress, List, ListItem, ListItemAvatar, ListSubheader, Paper, Stack, TextField,
  Typography, Zoom
} from '@mui/material';
import { useNavigate, useParams } from 'react-router';
import IconButton from '@mui/material/IconButton';
import { Add, ArrowBack, CheckCircle, Remove } from '@mui/icons-material';
import { useData } from './context';
import { addDocument, fetchCollection, getDocumentById, SYS_ORDER_STATUS, useWtrUser } from './api';
import { arrayUnion, serverTimestamp, Timestamp } from 'firebase/firestore';
import ProductImage from './shared';
import { Fragment, useState } from 'react';
import { useEffect } from 'react';





const useMnuFetcher = () => {
  const { setData } = useData();
  const { claims, loading, user } = useWtrUser();
  const [state, setState] = useState({ fetching: true, error: null });
  const params = useParams();


  useEffect(() => {
    if (loading || !user || !params?.merchantId) return;

    const unsubscribe = fetchCollection(params.merchantId, 'checkIn', { status: 'OPEN', 'tableId': Number(params.tableId), uid: user.uid },
      (checkInData) => {
        //atualiza o estado
        setData((state) => ({
          ...state,
          mnu: {
            ...state.mnu,
            checkIn: [...checkInData],
          },
        }));
      },
      (error) => setState({ fetching: false, error })
    );

    return () => unsubscribe();
  }, [loading, user, setData, params.tableId]);


  useEffect(() => {

    const unsubscribe = fetchCollection(params.merchantId, 'checkout', { status: 'OPEN', 'tableId': Number(params.tableId) },
      (checkoutData) => {
        //atualiza o estado
        setData((state) => ({
          ...state,
          mnu: {
            ...state.mnu,
            checkout: [...checkoutData],
          },
        }));
      },
      (error) => setState({ fetching: false, error })
    );

    return () => unsubscribe();
  }, [setData, params.tableId]);

  //busca status do 
  useEffect(() => {
    const unsubscribe = fetchCollection(params.merchantId, 'order_status', null,
      (data) => {
        //atualiza o estado
        setData((state) => ({
          ...state,
          mnu: {
            ...state.mnu,
            order_status: [...data],
          }
        }));
      },
      (error) => setState({ fetching: false, error })
    );

    return () => unsubscribe();
  }, [setData]);



  //busca os itens para popular o cardapio
  useEffect(() => {
    const unsubscribe = fetchCollection(params.merchantId, 'item', null,
      (data) => {

        const grouped = Object.values(
          data.reduce((acc, item) => {
            const { categoryId, name } = item.category;

            if (!acc[categoryId]) {
              acc[categoryId] = { categoryId, name, items: [] };
            }

            acc[categoryId].items.push(item);
            return acc;
          }, {})
        );

        //atualiza o estado
        setData((state) => ({
          ...state,
          mnu: {
            ...state.mnu,
            item: [...data],
            item_categorized: [...grouped]
            //item: [...grouped]
          }
        }));


        setState({ fetching: false, error: null })

      },
      (error) => setState({ fetching: false, error })
    );

    return () => unsubscribe();
  }, [setData]);




  return { ...state, claims, user };
};










export default function GarçomCardapioItem() {

  const navigate = useNavigate();

  const params = useParams();

  const { data } = useData();

  const item = data.mnu.item.find((i) => i.itemId === params.itemId);

  const [count, setCount] = useState(1);

  const [remarks, setRemarks] = useState('');

  const [checked, setChecked] = useState(true);

  const [complementos, setComplementos] = useState([]);

  //const { claims, user } = useWtrUser()
  const { error, fetching, claims, user } = useMnuFetcher();








  
  //adiciona item status carrinho
  const handleSelectedItem = async () => {

    const tableId = Number(params.tableId)

    //REVER
    const status = SYS_ORDER_STATUS.find(s => s.id === 'CAR');

    //REVER
    const customer = await getDocumentById(claims.merchantId, 'customer', user.uid);

    //REMOVER EXCESSO
    const order = {
      ...item,
      ...(complementos.length > 0 ? {
        options_selected: complementos
      } : {}
      ),
      qty_order: count,
      remarks: remarks,
      table: {
        tableId: Number(tableId),
      },
      createdAt: serverTimestamp(),
      customer: {
        uid: user.uid,
        name: customer.name
      },
      status: status.id,
      status_hist: arrayUnion({
        ...status,
        createdAt: Timestamp.now(),
        email: customer.name
      })
    }


    await addDocument(params.merchantId, 'order', order);

    setChecked((prev) => !prev);

    setComplementos([]);

    setTimeout(() => {
      navigate(-1);
    }, 1000);
  }

  //adiciona complementos
  const handleAddComplemento = (item_option) => {

    setComplementos((prevComplementos) => {
      const optionIndex = prevComplementos.findIndex((option) => option.optionId === item_option.optionId);

      if (optionIndex !== -1) {
        return prevComplementos.map((option) =>
          option.optionId === item_option.optionId
            ? { ...option, count: option.count + 1 }
            : option
        );
      } else {
        return [...prevComplementos, { ...item_option, count: 1 }];
      }
    });

  }

  //remove complementos
  const handleRemoveComplemento = (item_option) => {

    setComplementos((prevComplementos) => {
      const optionIndex = prevComplementos.findIndex((option) => option.key === item_option.key);

      if (optionIndex !== -1) {
        return prevComplementos.map((option) =>
          option.key === item_option.key
            ? { ...option, count: option.count - 1 }
            : option
        ).filter((option) => option.count > 0);

      } else {
        return [...prevComplementos];
      }
    });

  }

  //verifica qty
  const countComplementos = (item_option) => {
    const optionIndex = complementos.findIndex((option) => option.optionId === item_option.optionId);
    if (optionIndex !== -1) {
      return complementos[optionIndex].count
    }
    return 0
  }

  //totaliza provisorio
  const total_complementos = complementos.reduce((sum, item) => sum + item.count * item.price.value, 0);





  if (fetching) return <LinearProgress variant='indeterminate' sx={{ width: '100%', height: 2 }} />;

  if (error) return (
    <Alert severity="error">
      <Box whiteSpace="pre-line">
        {error.message}
      </Box>
    </Alert>
  );



  return (
    <Grid container
      sx={{
        p: 1,
        flexDirection: 'column',
        flexGrow: 1,
        justifyContent: 'space-between',
      }}
    >


      <Fragment>
        <Grid>

          <Paper variant='outlined'>
            <Grid container alignItems={'center'}>
              <IconButton onClick={() => navigate(`/wtr/mnu/${params.merchantId}/${params.tableId}`)}>
                <ArrowBack />
              </IconButton>
              <Typography>Voltar para o cardápio</Typography>
            </Grid>
          </Paper>



          <Zoom unmountOnExit mountOnEnter in={checked && !!item} timeout={200}>
            <Paper variant='outlined'
              sx={{
                mt: 1,
                mb: (th) => `${th.mixins.toolbar.minHeight * 2}px`,
                p: 1,
                //maxHeight: '75vh',
                //overflowY: 'auto'
              }}
            >
              <Stack p={1}>
                <Typography variant='h6' color='text.primary'>
                  {item.name}
                </Typography>
                <Typography variant='button' sx={{ color: 'text.secondary' }}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price.value)}
                </Typography>
              </Stack>

              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <ProductImage imagePath={item.imagePath} alt={item.name} w={'200px'} h={'200px'} />
              </Box>

              <Grid container direction={'column'} spacing={2} mt={2} p={1}>
                <Grid>
                  <Typography variant='body2' color='text.secondary'>
                    {item.description}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {item.additionalInformation}
                  </Typography>
                </Grid>


                {item.optionGroup.map((og) => (
                  <List key={og.optionGroupId} dense disablePadding>

                    <ListSubheader>
                      <Typography variant='h6' color='text.primary' textAlign={'center'}>
                        {/* og.name */ 'Complementos'}
                      </Typography>
                    </ListSubheader>


                    {og.options.map((row, index) => {

                      const qty_order_complemento = countComplementos(row);

                      return (
                        <Fragment key={index}>
                          <ListItem
                            secondaryAction={
                              <Stack direction={'row'}
                                sx={{
                                  alignItems: 'center',
                                  alignContent: 'center',
                                  bgcolor: (th) => qty_order_complemento > 0 && th.palette.background.paper
                                }}
                              >
                                {
                                  qty_order_complemento > 0 &&
                                  <Fragment>
                                    <IconButton size='small'
                                      onClick={() => handleRemoveComplemento(row)}
                                    >
                                      <Remove color='error' />
                                    </IconButton>

                                    <Typography>
                                      {qty_order_complemento}
                                    </Typography>
                                  </Fragment>
                                }

                                <IconButton size='small'
                                  onClick={() => handleAddComplemento(row)}
                                >
                                  <Add color='info' />
                                </IconButton>
                              </Stack>
                            }
                          >
                            <ListItemAvatar sx={{ pr: 2 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                <ProductImage imagePath={item.imagePath} alt={item.name} w={'75px'} h={'75px'} />
                              </Box>
                            </ListItemAvatar>

                            <Stack>
                              <Typography variant='body1' color='text.primary'>{row.name}</Typography>
                              <Typography variant='body2' color='text.secondary'>{row.description}</Typography>
                              <Stack direction={'row'}>
                                <Typography variant='body2' color='success'>
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.price.value)}
                                </Typography>
                              </Stack>
                            </Stack>
                          </ListItem>
                        </Fragment>
                      )
                    }
                    )}
                  </List>
                ))}

              </Grid>

              <Grid>
                <TextField label='Observações' fullWidth multiline minRows={2} margin='dense'
                  onChange={(e) => {
                    setRemarks(e.target.value);
                  }}
                />
              </Grid>
            </Paper>
          </Zoom>

          <Zoom in={!checked} timeout={500} unmountOnExit mountOnEnter>
            <Box
              sx={{
                position: 'fixed',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999
              }}
            >
              <CheckCircle color='success' sx={{ fontSize: 50 }} />
            </Box>
          </Zoom>
        </Grid>



        <Paper
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            p: 1,
            position: "fixed",
            bottom: (t) => t.mixins.toolbar.minHeight,
            left: 0,
            right: 0,
            zIndex: 99999
          }}
          variant='elevation'
          elevation={3}
        >
          <Stack direction={'row'} alignItems={'center'} columnGap={0.5}>
            <IconButton
              //disabled={!!data.mnu?.checkout.length}
              onClick={() => {
                if (count < 2) return; setCount(count - 1);
              }}
            >
              <Remove color='error' />
            </IconButton>

            <Typography>
              {count}
            </Typography>

            <IconButton
              disabled={!!data.mnu?.checkout.length}
              onClick={() =>
                setCount(count + 1)
              }
            >
              <Add color='info' />
            </IconButton>
          </Stack>

          <Button variant='contained' color='success' size='small'
            disableElevation
            disabled={!data?.mnu?.order_status?.length}
            sx={{
              textTransform: 'none'
            }}
            onClick={() => handleSelectedItem()}
          >
            <Typography>Adicionar</Typography>
            <Typography ml={1}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((count * item.price.value + total_complementos))}
            </Typography>
          </Button>
        </Paper>
      </Fragment>


    </Grid >
  );
}