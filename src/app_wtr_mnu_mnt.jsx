import { createTheme } from '@mui/material/styles';
import { ReactRouterAppProvider } from '@toolpad/core/react-router';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router';
import { ShoppingCart } from '@mui/icons-material';
import { useData } from './context';
import { Alert, Badge, BottomNavigation, BottomNavigationAction, Box, Grid, LinearProgress, Paper } from '@mui/material';
import { fetchCollection, listenMerchantById, useWtrUser } from './api';
import { useState } from 'react';
import { useEffect } from 'react';




const demoTheme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'data-toolpad-color-scheme',
  },
  colorSchemes: { light: true, dark: true },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 600,
      lg: 1200,
      xl: 1536,
    },
  },
});





const useMnuFetcher = () => {
  const { setData } = useData();
  const { claims, loading, user } = useWtrUser();
  const [state, setState] = useState({ fetching: true, error: null });
  const params = useParams();

  useEffect(() => {
    if (loading || !params?.merchantId) return;

    const unsubscribe = listenMerchantById(
      params.merchantId,
      (data) => {
        setData((state) => ({
          ...state,
          ...data
        }));

        setState({ fetching: false, error: null });
      },
      (error) => setState({ fetching: false, error })
    );


    const unsubOrder = fetchCollection(params.merchantId,
      'order', { 'status': ['CAR'], 'table.tableId': Number(params.tableId), 'customer.uid': user.uid, },
      (data) => {
        //atualiza o estado
        setData((state) => ({
          ...state,
          mnu: {
            ...state.mnu,
            order: [...data],
          }
        }));

        setState({ fetching: false, error: null });
      },
      (error) => {
        setError(error);
      }
    );

    return () => {
      unsubscribe();
      unsubOrder();
    };
  }, [loading, claims, setData]);

  return { ...state, claims, user };
};






function Content() {

  const { data } = useData();
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const { fetching, error } = useMnuFetcher();

  const itensCarrinho = data.mnu.order.filter((i) => i.status === 'CAR').length;


  if (fetching) return <LinearProgress variant='indeterminate' sx={{ width: '100%', height: 2 }} />;

  if (error) return (
    <Alert severity="error">
      <Box whiteSpace="pre-line">
        {error.message}
      </Box>
    </Alert>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column'
      }}
      variant='outlined'
      elevation={0}
    >
      <Outlet />


      <Paper
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 99999
        }}
        variant='elevation'
        elevation={3}
      >
        <BottomNavigation showLabels sx={{ width: '100%' }}>
          <BottomNavigationAction label='Carrinho' icon={
            itensCarrinho ?
              <Badge badgeContent={itensCarrinho} color='info' >
                <ShoppingCart color={location.pathname.includes('cart') ? 'warning' : 'inherit'} />
              </Badge>
              :
              <ShoppingCart color={location.pathname.includes('cart') ? 'warning' : 'inherit'} />
          }
            onClick={() => navigate(`/wtr/mnu/${params.merchantId}/${params.tableId}/cart`)}
          />
        </BottomNavigation>
      </Paper>

    </Box>
  );
}



export default function GarçomGestaoMnu() {


  return (
    <ReactRouterAppProvider
      theme={demoTheme}
    >
      <Grid container size={12} direction={'column'}>
        <Content />
      </Grid>
    </ReactRouterAppProvider>
  )
}