import Typography from '@mui/material/Typography';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import { ReactRouterAppProvider } from '@toolpad/core/react-router';
import { Outlet, useParams } from 'react-router';
import { Stack } from '@mui/system';
import { Add, Category, Fastfood, HelpOutline, Microwave, Payment, People, TableRestaurant, Tune } from '@mui/icons-material';
import { PageContainer, useActivePage } from '@toolpad/core';
import { fetchCollection, listenMerchantById, logout, useMntUser } from './api';
import { useData } from './context';
import { LinearProgress, Paper } from '@mui/material';
import { useSmartTruncate } from './utils/shared';
import { theme } from './shared';
import logo from './assets/logoSF.svg';
import { useState } from 'react';
import { useEffect } from 'react';
import { useMemo } from 'react';






const useMntFetcher = () => {
  const { setData } = useData();
  const [error, setError] = useState(null);
  const { loading, claims, user } = useMntUser();
  const [fetching, setFetching] = useState(loading);

  useEffect(() => {
    if (claims?.merchantId) {

      listenMerchantById(
        claims.merchantId,
        (data) => {
          //atualiza o estado
          setData((state) => ({
            ...state,
            ...data
          }));

          setFetching(false);
        },
        (error) => {
          setError(error);
        }
      );

    }
  }, [setData, loading]);

  useEffect(() => {
    if (loading || !claims?.merchantId) return;

    const unsubscribe = fetchCollection(
      claims.merchantId,
      'event',
      null,
      (data) => {
        //atualiza o estado
        setData((state) => ({
          ...state,
          mnt: {
            ...state.mnt,
            adm: {
              ...state.mnt.adm,
              payment: [...data]
            }
          }
        }));

      },
      (err) => {
        setError(err);
      }
    );

    return () => unsubscribe();
  }, [loading, claims, setData]);


  return { loading, error, claims, user, fetching };
};





function CustomAppTitle() {
  const { data } = useData();

  const truncateText = useSmartTruncate();

  return (
    <Stack direction="row" alignItems="center" spacing={2}>
      <img alt='Logotipo' src={logo} width={27} />

      <Typography variant="h6">
        {truncateText(data.name)}
      </Typography>
    </Stack>
  );
}


function Content() {
  const { key } = useParams();

  const activePage = useActivePage();

  const helpInfo = {
    'Mesas': 'Informe a quantidade de mesas do estabelecimento e imprima códigos acesso.',
    'Cozinhas': 'Defina telas para cada ambiente de preparo',
    'Colaboradores': (
    <>
      <span>Gerencie os acessos á tela do Garçom e á tela da Cozinha.</span>
      <br />
      <span>Use o QR Code ou o link de compartilhamento pra abrir a tela do Garçom ou a tela da Cozinha.</span>
    </>
  ),
    'Categorias': 'Cadastre categorias de produtos para facilitar a navegação.',
    'Complementos': 'Defina complementos para os produtos.',
    'Produtos': 'Cadastre e edite produtos, preços e imagens',
    'Pedidos': 'Visualize os pedidos dos últimos três dias',
    'Configurações': 'Ajuste parâmetros gerais do sistema conforme seu estabelecimento.',
    'Minha conta': 'Gerencie assinatura, plano e informações de cobranças.',
  };


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

  return (
    <PageContainer title={""} breadcrumbs={breadcrumbs}
      slots={{
        header: () => {
          return (
            <Stack>
              <Typography variant='h6'>
                {breadcrumbs.map(b => b.title).join(' / ')}
              </Typography>


              {!isForm &&
                <Paper
                  variant='outlined'
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 1,
                    gap: 1,
                    mt: 2
                  }}>
                  <HelpOutline color='disabled' />
                  <Typography variant='body2'>
                    {helpInfo[activePage.title]}
                  </Typography>
                </Paper>
              }
            </Stack>
          )
        }
      }}
    >
      <Outlet />
    </PageContainer>
  );
}




export default function GestaoApp() {

  const { user, fetching } = useMntFetcher();

  const [session, setSession] = useState(null);

  const authentication = useMemo(() => {
    return {
      signOut: () => {
        logout();
      },
    };
  }, []);

  const { data } = useData();

  //implementar
  const restriction = false;

  const NAVIGATION = [
    {
      path: 'tbl',
      segment: 'mnt/tbl',
      title: 'Mesas',
      pattern: 'mnt/tbl{/:key}*',
      icon: <TableRestaurant />,
    },
    {
      path: 'kds',
      segment: 'mnt/kds',
      title: 'Cozinhas',
      pattern: 'mnt/kds{/:key}*',
      icon: <Microwave />,
    },
    {
      path: 'usr',
      segment: 'mnt/usr',
      title: 'Colaboradores',
      pattern: 'mnt/usr{/:key}*',
      icon: <People />,
    },
    {
      path: 'ctg',
      segment: 'mnt/ctg',
      title: 'Categorias',
      pattern: 'mnt/ctg{/:key}*',
      icon: <Category />
    },
    {
      path: 'opt',
      segment: 'mnt/opt',
      title: 'Complementos',
      pattern: 'mnt/opt{/:key}*',
      icon: <Add />,
    },
    {
      path: 'pdt',
      segment: 'mnt/pdt',
      title: 'Produtos',
      pattern: 'mnt/pdt{/:key}*',
      icon: <Fastfood />
    },
    {
      path: 'ord',
      segment: 'mnt/ord',
      title: 'Pedidos',
      icon: <ShoppingCartIcon />,
    },
    {
      path: 'pmt',
      segment: 'mnt/pmt',
      title: 'Configurações',
      icon: <Tune />,
    },
    {
      kind: 'divider',
    },
    {
      path: 'acc',
      segment: 'mnt/acc',
      title: restriction ? <Typography color='error'>Teste encerrado</Typography> : 'Minha conta',
      icon: <Payment
        sx={{
          animation: restriction && 'blinker 1s infinite',
          '@keyframes blinker': {
            '50%': { opacity: 0 },
          },
        }}
      />,
    },
  ];


  useEffect(() => {
    if (user) {
      setSession({ user: { email: user.email } });
    }
  }, [user]);


  if (fetching) return (
    <LinearProgress
      variant="indeterminate"
      sx={(t) => ({
        width: '100%',
        height: 2,
        '& .MuiLinearProgress-bar': {
          backgroundColor: t.palette.primary.main,
        },
        backgroundColor: t.palette.action.disabledBackground,
      })}
    />
  );


  return (
    <ReactRouterAppProvider
      navigation={
        NAVIGATION
          .filter(menu =>
            menu.path === 'acc' ||
            data.module
              .filter(m => m.enabled)
              .flatMap(m => m.menuItems)
              .some(
                mdl => !menu.path || mdl.path === menu.path
              )
          )
      }
      theme={theme}
      authentication={authentication}
      session={session}
    >
      <DashboardLayout
        slots={{
          appTitle: CustomAppTitle
        }}
      >
        <Content />
      </DashboardLayout>
    </ReactRouterAppProvider>
  )
}