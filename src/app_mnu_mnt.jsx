import Typography from '@mui/material/Typography';
import { createTheme } from '@mui/material/styles';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import { ReactRouterAppProvider } from '@toolpad/core/react-router';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router';
import { Grading, PanTool, QrCode, ShoppingCart } from '@mui/icons-material';
import { useData } from './context';
import { useSmartTruncate } from './utils/shared';
import logo from './assets/logoSF.svg';
import {
  Alert,
  Badge,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
} from '@mui/material';
import { HelpDialog } from './shared';
import {
  addDocument,
  fetchCollection,
  listenMerchantById,
  useAuthUser,
} from './api';
import { useDialogs } from '@toolpad/core';
import { useState } from 'react';
import { useEffect } from 'react';

const demoTheme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'data-toolpad-color-scheme',
  },
  colorSchemes: { light: true, dark: false },
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
  const { claims, loading, user } = useAuthUser();
  const [state, setState] = useState({ fetching: true, error: null });
  const params = useParams();

  useEffect(() => {
    if (loading || !params?.merchantId) return;

    const unsubscribe = listenMerchantById(
      params.merchantId,
      (data) => {
        setData((state) => ({
          ...state,
          ...data,
        }));
      },
      (error) => setState({ fetching: false, error })
    );

    const unsubOrder = fetchCollection(
      params.merchantId,
      'order',
      {
        status: ['CAR'],
        'table.tableId': Number(params.tableId),
        'customer.uid': user.uid,
      },
      (data) => {
        //atualiza o estado
        setData((state) => ({
          ...state,
          mnu: {
            ...state.mnu,
            order: [...data],
          },
        }));
      },
      (error) => {
        setError(error);
      }
    );

    const unsubCheckIn = fetchCollection(
      params.merchantId,
      'checkIn',
      { status: ['SCANNED', 'OPEN'], uid: user.uid },
      (checkInData) => {
        //atualiza o estado
        setData((state) => ({
          ...state,
          mnu: {
            ...state.mnu,
            checkIn: [...checkInData],
          },
        }));

        setState({ fetching: false, error: null });
      },
      (error) => setState({ fetching: false, error })
    );

    return () => {
      unsubscribe();
      unsubOrder();
      unsubCheckIn();
    };
  }, [loading, claims, setData]);

  return { ...state, claims, user };
};

function CustomAppTitle() {
  const { data } = useData();
  const truncateText = useSmartTruncate();

  return (
    <Stack
      direction='row'
      alignItems='center'
      spacing={2}
      justifyContent={'space-between'}
    >
      <Stack direction='row' alignItems='center' spacing={2}>
        <img alt='Logotipo' src={logo} width={27} />

        <Typography variant='button'>{`${truncateText(data.name)}`}</Typography>
      </Stack>
    </Stack>
  );
}

function CustomToll() {
  const params = useParams();

  return (
    <Stack direction='row' alignItems='center' justifyContent={'space-between'}>
      <Typography color='text.secondary'>
        {`Mesa: ${params.tableId}`}
      </Typography>
      <IconButton>
        <QrCode />
      </IconButton>
    </Stack>
  );
}

function Content() {
  const { data } = useData();
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dialogs = useDialogs();

  const { fetching, error, user } = useMnuFetcher();

  const itensCarrinho = data.mnu.order.filter((i) => i.status === 'CAR').length;

  const mnu_enabled = data.module?.find(m => m.moduleId === 2)?.enabled && !!data?.mnu_interactive_enabled;

  const handleHelp = async () => {
    const result = await dialogs.open(HelpDialog);

    if (!!result?.text) {
      addDocument(params.merchantId, 'help', {
        tableId: Number(params.tableId),
        ...result,
        //REVER
        uid: user.uid,
        status: 'OPEN',
        createdAt: new Date(),
      });
    }
  };

  if (fetching)
    return (
      <LinearProgress
        variant='indeterminate'
        sx={{ width: '100%', height: 2 }}
      />
    );

  if (error)
    return (
      <Alert severity='error'>
        <Box whiteSpace='pre-line'>{error.message}</Box>
      </Alert>
    );

  if (!data.mnu.checkIn.length)
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          justifyContent: 'center',
          justifyItems: 'center',
        }}
        variant='outlined'
        elevation={0}
      >
        <Typography textAlign={'center'}>
          Escaneie novamente o QR Code da mesa.
        </Typography>

        {/* <QRCameraScanner /> */}
      </Box>
    );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
      }}
      variant='outlined'
      elevation={0}
    >
      <Outlet />

      {
        !!mnu_enabled &&
        <Paper
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 99999,
          }}
          variant='elevation'
          elevation={3}
        >
          <BottomNavigation showLabels sx={{ width: '100%' }}>
            <BottomNavigationAction
              label='Atendente'
              icon={<PanTool />}
              onClick={handleHelp}
            />
            <BottomNavigationAction
              label='Carrinho'
              icon={
                itensCarrinho ? (
                  <Badge badgeContent={itensCarrinho} color='info'>
                    <ShoppingCart
                      color={
                        location.pathname.includes('cart') ? 'warning' : 'inherit'
                      }
                    />
                  </Badge>
                ) : (
                  <ShoppingCart
                    color={
                      location.pathname.includes('cart') ? 'warning' : 'inherit'
                    }
                  />
                )
              }
              onClick={() =>
                navigate(`/mnu/${params.merchantId}/${params.tableId}/cart`)
              }
            />
            <BottomNavigationAction
              label='Conta'
              icon={
                <Grading
                  color={
                    location.pathname.includes('pay') ? 'warning' : 'inherit'
                  }
                />
              }
              onClick={() =>
                navigate(`/mnu/${params.merchantId}/${params.tableId}/pay`)
              }
            />
          </BottomNavigation>
        </Paper>
      }
    </Box>
  );
}

export default function GestaoMnu() {
  const { data } = useData();

  const { tableId } = useParams();

  const navigate = useNavigate();

  useEffect(() => {
    if (!data.mnu.checkIn.length) return;

    if (data.mnu.checkIn[0].tableId !== Number(tableId)) {
      console.log('mudou mesa para', data.mnu.checkIn[0]?.tableId);

      const p = location.pathname.split('/');

      p[3] = data.mnu.checkIn[0]?.tableId;

      const newPath = p.join('/') || '/';

      navigate(newPath, { replace: true });
    }
  }, [tableId, data.mnu.checkIn]);

  return (
    <ReactRouterAppProvider theme={demoTheme}>
      <DashboardLayout
        defaultSidebarCollapsed
        disableCollapsibleSidebar
        hideNavigation
        slots={{
          appTitle: CustomAppTitle,
          toolbarActions: CustomToll,
        }}
      >
        <Content />
      </DashboardLayout>
    </ReactRouterAppProvider>
  );
}
