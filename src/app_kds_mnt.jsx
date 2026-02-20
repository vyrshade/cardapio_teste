import Typography from '@mui/material/Typography';
import { createTheme } from '@mui/material/styles';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import { ReactRouterAppProvider } from '@toolpad/core/react-router';
import { Outlet } from 'react-router';
import { Stack } from '@mui/system';
import { History, Kitchen, Microwave } from '@mui/icons-material';
import { PageContainer } from '@toolpad/core';
import { listenMerchantById, useKdsUser } from './api';
import { useData } from './context';
import { Alert, Box, LinearProgress } from '@mui/material';
import { useState } from 'react';
import { useEffect } from 'react';
import { useSmartTruncate } from './utils/shared';




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
  const { userListenStatus } = useKdsUser();
  return (
    <Stack direction="row" alignItems="center" spacing={2}>
      <Typography variant='h6'>{`${truncateText(data.name)}`}</Typography>
      <Typography variant='h6'>{userListenStatus?.name}</Typography>
    </Stack>
  );
}





const useKdsFetcher = () => {
  const { setData } = useData();
  const { claims, loading, user, userListenStatus } = useKdsUser();
  const [state, setState] = useState({ fetching: true, error: null });


  useEffect(() => {
    if (loading || !claims?.merchantId) return;

    const unsubscribe = listenMerchantById(
      claims.merchantId,
      (data) => {
        setData((state) => ({
          ...state,
          ...data
        }));

        setState({ fetching: false, error: null });
      },
      (error) => setState({ fetching: false, error })
    );

    return () => {
      unsubscribe();
    };
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





export default function GestaoKds() {

  const { fetching, error, userListenStatus } = useKdsFetcher();

  const urlKdsUser = userListenStatus?.kds ? `kds/${userListenStatus.kds.kdsId}` : `kds`

  const NAVIGATION = [
    {
      kind: 'header',
      title: 'Principal',
    },
    {
      segment: urlKdsUser,
      title: 'Pedidos',
      pattern: 'kds{/:key((?!ord).*)}*',
      icon: <Microwave />,
    },
    {
      segment: 'kds/ord',
      title: 'Histórico',
      pattern: 'kds/ord',
      icon: <History />,
    },
  ];

  if (fetching) return <LinearProgress variant='indeterminate' sx={{ width: '100%', height: 2 }} />;

  if (error) return (
    <Alert severity="error">
      <Box whiteSpace="pre-line">
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
          appTitle: CustomAppTitle
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