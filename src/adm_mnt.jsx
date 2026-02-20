import * as React from 'react';
import Typography from '@mui/material/Typography';
import { createTheme } from '@mui/material/styles';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import { ReactRouterAppProvider } from '@toolpad/core/react-router';
import { Outlet, useParams } from 'react-router';
import { Stack } from '@mui/system';
import { AccountTree, Build, Pix, Store } from '@mui/icons-material';
import { PageContainer, useActivePage } from '@toolpad/core';
import { logout, useAuthUser } from './api';


const NAVIGATION = [
  {
    kind: 'header',
    title: 'Principal',
  },
  {
    segment: 'adm',
    title: 'Estabelecimentos',
    //pattern: 'adm{/mct/:key}*',
    pattern: 'adm{/mct/:key}*{/mdl/:moduleId}*',
    icon: <Store />,
  },
  {
    segment: 'adm/pay',
    title: 'Pagamentos',
    pattern: 'adm/pay{/:key}*',
    icon: <Pix />,
  },
  {
    segment: 'adm/mod',
    title: 'Módulos',
    pattern: 'adm/mod{/:key}*',
    icon: <Build />,
  }
];







const demoTheme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'data-toolpad-color-scheme',
  },
  colorSchemes: { light: true, dark: true },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
});


function CustomAppTitle() {
  return (
    <Stack direction='row' alignItems='center' spacing={2}>
      <AccountTree fontSize='large' color='primary' />
      <Typography variant='h6'>{'Administração'}</Typography>
    </Stack>
  );
}





function Content() {
  const { key } = useParams();

  const activePage = useActivePage();

  if (!activePage) {
    return (
      <PageContainer sx={{ m: 0.5 }}>
        <Outlet />
      </PageContainer>
    )
  }

  const isForm = key !== undefined;

  let title = !isForm
    ? activePage.title
    : key === '0'
      ? 'Incluir'
      : 'Editar';

  let breadcrumbs = !isForm
    ? activePage.breadcrumbs
    : [...activePage.breadcrumbs, { title }];
  /* 
    if (activePage.title === 'Primeiros passos') {
      title = '';
      breadcrumbs = [];
    } */

  return (
    <PageContainer title={title} breadcrumbs={breadcrumbs} sx={{ m: 0.5 }}>
      <Outlet />
    </PageContainer>
  );
}




export default function GestaoAdm() {

  const { user } = useAuthUser();

  const [session, setSession] = React.useState(null);

  React.useEffect(() => {
    if (user) {
      setSession({ user: { email: user.email } });
    }
  }, [user]);

  const authentication = React.useMemo(() => {
    return {
      signOut: () => {
        logout();
      },
    };
  }, []);


  if (!user) return <></>;

  return (
    <ReactRouterAppProvider
      navigation={NAVIGATION}
      theme={demoTheme}
      authentication={authentication}
      session={session}
    >
      <DashboardLayout
        slots={{
          appTitle: CustomAppTitle
        }}>
        <Content />
      </DashboardLayout>
    </ReactRouterAppProvider>
  )
}