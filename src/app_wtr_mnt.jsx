import Typography from '@mui/material/Typography';
import { createTheme } from '@mui/material/styles';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import { ReactRouterAppProvider } from '@toolpad/core/react-router';
import { Outlet } from 'react-router';
import { Stack } from '@mui/system';
import { EmojiPeople, History, LowPriority, Microwave, MicrowaveOutlined, PriorityHigh, TableRestaurant } from '@mui/icons-material';
import { PageContainer } from '@toolpad/core';
import { fetchCollection, listenMerchantById, useWtrUser } from './api';
import { useData } from './context';
import { Alert, Box, Checkbox, LinearProgress } from '@mui/material';
import { useState } from 'react';
import { useEffect } from 'react';
import { useSmartTruncate } from './utils/shared';
import { ThemeSwitcher } from '@toolpad/core';










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


function CustomAppTitle() {
  const { data } = useData();
  const truncateText = useSmartTruncate();
  const { userListenStatus } = useWtrUser();

  return (
    <Stack direction='row' alignItems='center' spacing={2}>
      <Typography variant='h6'>{`${truncateText(data.name)}`}</Typography>
      <Typography variant='h6'>{userListenStatus?.name}</Typography>
    </Stack>
  );
}



function CustomToolbarActions() {
  const { data, setData } = useData();

  const index_sps = data.wtr.order_status.findIndex((s) => s.id === 'SPS');

  const handleChange = (event) => {
    const { name, checked } = event.target;

    setData((state) => ({
      ...state,
      wtr: {
        ...state.wtr,
        [name]: checked,
      },
    }));
  };


  return (
    <>
      {index_sps !== -1 &&
        <Checkbox
          name='order_kds_show'
          icon={<Microwave />}
          checkedIcon={<MicrowaveOutlined />}
          checked={data.wtr.order_kds_show}
          onChange={handleChange}
        />
      }
      <Checkbox
        name='order_my_action_show'
        icon={<LowPriority />}
        checkedIcon={<PriorityHigh />}
        checked={data.wtr.order_my_action_show}
        onChange={handleChange}
      />

      <ThemeSwitcher />
    </>

  );
}


const useWtrFetcher = () => {
  const { setData } = useData();
  const { claims, loading, user } = useWtrUser();
  const [state, setState] = useState({ fetching: true, error: null });
  const [userListenStatus, setUserListenStatus] = useState(null);

  useEffect(() => {
    if (loading || !claims?.merchantId) return;

    const unsubscribe = listenMerchantById(
      claims.merchantId,
      (data) => {
        setData((state) => ({
          ...state,
          ...data
        }));
      },
      (error) => setState({ fetching: false, error })
    );

    const unsubUsr = fetchCollection(claims.merchantId, 'user', { token: claims.token },
      (data) => {
        setUserListenStatus({ ...data?.[0] })
        setState({ fetching: false, error: null });
      },
      (error) => setState({ fetching: false, error })
    );

    return () => {
      unsubscribe();
      unsubUsr();
    };
  }, [loading, claims, setData]);



  useEffect(() => {
    if (loading || !claims?.merchantId) return;
    const unsubscribe = fetchCollection(claims.merchantId, 'help', { status: 'OPEN' },
      (helpData) => {
        //atualiza o estado
        setData((state) => ({
          ...state,
          wtr: {
            ...state.wtr,
            help: [...helpData],
          },
        }));
      },
      (error) => setState({ fetching: false, error })
    );

    return () => unsubscribe();
  }, [loading, claims, setData]);


  return { ...state, claims, user, userListenStatus };
};







function Content() {
  return (
    <PageContainer title={''} breadcrumbs={[]}>
      <Outlet />
    </PageContainer>
  );
}




export default function GestaoWtr() {

  const { fetching, error, userListenStatus } = useWtrFetcher();

  const { data, setData } = useData();


  const NAVIGATION = [
    {
      kind: 'header',
      title: 'Principal',
    },
    {
      segment: 'wtr',
      title: 'Pedidos',
      icon: <EmojiPeople
        sx={{
          animation: data.wtr.help.length && 'blinker 1s infinite',
          '@keyframes blinker': {
            '50%': { opacity: 0 },
          },
        }}
      />,
    },
    {
      segment: 'wtr/tbl',
      title: 'Mesas',
      pattern: 'wtr/tbl{/:key((?!tableId).*)}*',
      icon: <TableRestaurant />,
    },
    {
      segment: 'wtr/ord',
      title: 'Histórico',
      icon: <History />,
    },
  ];



  //REVER
  /* useEffect(() => {
    const index_sps = data.wtr.order_status.findIndex((s) => s.id === 'SPS');
    if (index_sps !== -1) {
      setData((state) => ({
        ...state,
        wtr: {
          ...state.wtr,
          order_kds_show: false,
        }
      }));
    }
  }, [data.wtr.order_status]) */


  if (fetching) return <LinearProgress variant='indeterminate' sx={{ width: '100%', height: 2 }} />;

  if (error) return (
    <Alert severity='error'>
      <Box whiteSpace='pre-line'>
        {error.message}
      </Box>
    </Alert>
  );

  return (
    <ReactRouterAppProvider
      navigation={NAVIGATION}
      theme={demoTheme}
    >
      <DashboardLayout
        defaultSidebarCollapsed
        slots={{
          appTitle: CustomAppTitle,
          toolbarActions: CustomToolbarActions
        }}
      >
        {!!userListenStatus.status ?
          <Content />
          :
          <Alert severity='error'>
            <Box whiteSpace='pre-line'>
              {'Verifique seu acesso com o Administrador.'}
            </Box>
          </Alert>
        }
      </DashboardLayout>
    </ReactRouterAppProvider>
  )
}