import { Grid, LinearProgress, Typography } from '@mui/material';
import { createBrowserRouter, Outlet, useLocation, useNavigate, useParams } from 'react-router';
import { addDocument, useAdmUser, useAuthUser, useKdsUser, useMntUser } from './api';
import Cardapio from './app_mnu';
import CardapioItem from './app_mnu_itm';
import GestaoApp from './app_mnt';
import DisplayCozinha from './app_kds';
import PedidoLista from './app_mnt_ord_list';
import CategoriaLista from './app_mnt_ctg_list';
import CategoriaForm from './app_mnt_ctg_form';
import ComplementoLista from './app_mnt_opt_list';
import ComplementoForm from './app_mnt_opt_form';
import Mesa from './app_mnt_tbl';
import MesaForm from './app_mnt_tbl_form';
import UsuarioLista from './app_mnt_usr_list';
import UsuarioForm from './app_mnt_usr_form';
import Garçom from './app_wtr';
import GarçomHist from './app_wtr_ord_list';
import MerchantList from './adm_mct_list';
import MerchantForm from './adm_mct_form';
import Login from './login';
import { VerificaEmail } from './verify';
import LoginRecovery from './login_rcy';
import LoginChange from './login_chg';
import GestaoAdm from './adm_mnt';
import ParametroSistema from './app_mnt_pmt';
import DisplayLista from './app_mnt_kds_list';
import DisplayForm from './app_mnt_kds_form';
import MerchantFormMkt from './adm_mct_form_mkt';
import PagamentoLista from './adm_mct_pay_list';
import PagamentoForm from './adm_mct_pay_form';
import GestaoWtr from './app_wtr_mnt';
import GestaoKds from './app_kds_mnt';
import DisplayListaSelect from './app_kds_list';
import ProdutoLista from './app_mnt_pdt_list';
import ProdutoForm from './app_mnt_pdt_form';
import UsuarioAuth from './usr_auth';
import KdsHist from './app_kds_ord_list';
import GestaoMnu from './app_mnu_mnt';
import Cart from './app_mnu_cart';
import CartSuccess from './app_mnu_cart_scs';
import Conta from './app_mnu_pay';
import { useEffect } from 'react';
import { serverTimestamp } from 'firebase/firestore';
import GarçomMesas from './app_wtr_tbl_list';
import GarçomCardapio from './app_wtr_mnu';
import GarçomGestaoMnu from './app_wtr_mnu_mnt';
import GarçomCardapioItem from './app_wtr_mnu_itm';
import GarçomCart from './app_wtr_mnu_cart';
import GarçomCartSuccess from './app_wtr_mnu_cart_scs';
import GarçomMesaDetalhe from './app_wtr_tbl';
import Assinatura from './app_mnt_acc';
import ModuloLista from './adm_cfg_mod_list';
import ModuloForm from './adm_cfg_mod_form';
import MerchantModuloForm from './adm_mct_form_mod_form';
import MerchantModuloLista from './adm_mct_form_mod_list';




const RootLayout = () => {
  return (
    <Grid container>
      <Outlet />
    </Grid>
  )
}



const RootApp = () => {
  const { user, claims, loading } = useMntUser();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    const fetchUserData = async () => {
      if (!user?.email) {
        navigate('/login', { replace: true });
        return;
      }

      if (user?.email && claims && location.pathname === '/') {
        const level = claims.accessLevel;

        if (level === 10) {
          navigate('mnt/tbl', { replace: true });
        }

        if (level === 1000) {
          navigate('adm', { replace: true });
        }
      }

    };

    fetchUserData();
  }, [user, claims, loading, location.pathname, navigate]);

  return <RootLayout />;
};




const RootMnu = () => {

  const location = useLocation();
  const { merchantId, tableId, qr } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuthUser();

  useEffect(() => {
    if (loading || !user) return;

    if (qr) {
      const basePath = location.pathname
        .split('/')
        .slice(0, -1)
        .join('/') || '/';

      addDocument(merchantId, 'checkIn', {
        tableId: Number(tableId),
        uid: user.uid,
        status: 'SCANNED',
        createdAt: serverTimestamp()
      })
        .then(() => {
          navigate(basePath, { replace: true });
        })
        .catch(console.error);

    }


  }, [loading, user]);




  return <RootLayout />;
};




const RootWtr = () => {
  ///
  return <RootLayout />;
};





const RootKds = () => {
  const { user, loading, userListenStatus } = useKdsUser();
  const navigate = useNavigate();


  useEffect(() => {
    if (loading || !user) return;

    //REVER
    if (userListenStatus?.kds?.kdsId) {
      navigate(`/kds/${userListenStatus.kds.kdsId}`)
    } else {
      navigate('/kds')
    }


  }, [loading, navigate, userListenStatus]);


  if (loading) return <LinearProgress variant='indeterminate' sx={{ width: '100%', height: 2 }} />;

  return <RootLayout />;
};













const RootAdm = () => {
  const { user, claims, loading } = useAdmUser();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    //ver tela login propria

    if (!user?.email) {
      navigate('/login', { replace: true });
      return;
    }

    const level = claims.accessLevel;

    if (level < 1000) {
      navigate('/', { replace: true });
    }

  }, [user, claims, loading, location.pathname, navigate]);

  if (loading) return <div>Carregando...</div>;

  return <RootLayout />;
};





export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootApp />,
    errorElement: <Typography color={'primary'}>Vefifique suporte</Typography>,
    children: [
      {
        path: 'mnt',
        element: <GestaoApp />,
        children: [
          {
            path: 'tbl',
            element: <Mesa />
          },
          {
            path: 'tbl/:key',
            element: <MesaForm />
          },
          {
            path: 'kds',
            element: <DisplayLista />
          },
          {
            path: 'kds/:key',
            element: <DisplayForm />
          },
          {
            path: 'usr',
            element: <UsuarioLista />
          },
          {
            path: 'usr/:key',
            element: <UsuarioForm />
          },
          {
            path: 'ctg',
            element: <CategoriaLista />
          },
          {
            path: 'ctg/:key',
            element: <CategoriaForm />
          },
          {
            path: 'opt',
            element: <ComplementoLista />
          },
          {
            path: 'opt/:key',
            element: <ComplementoForm />
          },
          {
            path: 'pdt',
            element: <ProdutoLista />
          },
          {
            path: 'pdt/:key',
            element: <ProdutoForm />
          },
          {
            path: 'ord',
            element: <PedidoLista />
          },
          {
            path: 'pmt',
            element: <ParametroSistema />
          },
          {
            path: 'acc',
            element: <Assinatura />
          },
        ]
      },
    ],
  },
  {
    path: '/mnu',
    element: <RootMnu />,
    errorElement: <Typography color={'primary'}>Vefifique suporte</Typography>,
    children: [
      {
        path: '',
        element: <GestaoMnu />,
        children: [
          {
            path: ':merchantId?/:tableId?/:qr?',
            element: <Cardapio />
          },
          {
            path: ':merchantId?/:tableId?/pay',
            element: <Conta />
          },
          {
            path: ':merchantId?/:tableId?/item/:itemId?',
            element: <CardapioItem />
          },
          {
            path: ':merchantId?/:tableId?/cart',
            element: <Cart />
          },
          {
            path: ':merchantId?/:tableId?/cart/scs',
            element: <CartSuccess />
          },
        ],
      },
    ],
  },
  {
    path: '/wtr',
    element: <RootWtr />,
    errorElement: <Typography color={'primary'}>Vefifique suporte</Typography>,
    children: [
      {
        path: '',
        element: <GestaoWtr />,
        children: [
          {
            path: '',
            element: <Garçom />
          },
          {
            path: 'tbl',
            element: <GarçomMesas />
          },
          {
            path: 'tbl/:tableId',
            element: <GarçomMesaDetalhe />
          },
          {
            path: 'ord',
            element: <GarçomHist />
          },
          {
            path: 'mnu',
            element: <RootMnu />,
            errorElement: <Typography color={'primary'}>Vefifique suporte</Typography>,
            children: [
              {
                path: '',
                element: <GarçomGestaoMnu />,
                children: [
                  {
                    path: ':merchantId?/:tableId?/:qr?',
                    element: <GarçomCardapio />
                  },
                  {
                    path: ':merchantId?/:tableId?/item/:itemId?',
                    element: <GarçomCardapioItem />
                  },
                  {
                    path: ':merchantId?/:tableId?/cart',
                    element: <GarçomCart />
                  },
                  {
                    path: ':merchantId?/:tableId?/cart/scs',
                    element: <GarçomCartSuccess />
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '/kds',
    element: <RootKds />,
    errorElement: <Typography color={'primary'}>Vefifique suporte</Typography>,
    children: [
      {
        path: '',
        element: <GestaoKds />,
        children: [
          {
            path: '',
            element: <DisplayListaSelect />
          },
          {
            path: ':key',
            element: <DisplayCozinha />
          },
          {
            path: 'ord',
            element: <KdsHist />
          },
        ],
      }
    ],
  },
  {
    path: '/adm',
    element: <RootAdm />,
    errorElement: <Typography color={'primary'}>Vefifique suporte</Typography>,
    children: [
      {
        path: '',
        element: <GestaoAdm />,
        children: [
          {
            path: '',
            element: <MerchantList />
          },
          {
            path: 'mct/:key',
            element: <MerchantForm />,
            children: [
              {
                path: '',
                element: <MerchantModuloLista />
              },
              {
                path: 'mdl/:moduleId',
                element: <MerchantModuloForm />
              },
            ]
          },
          /* {
            path: 'mct/:key/mdl/:moduleId',
            element: <MerchantModuloForm />
          }, */
          {
            path: 'pay',
            element: <PagamentoLista />
          },
          {
            path: 'pay/:key',
            element: <PagamentoForm />
          },
          {
            path: 'mod',
            element: <ModuloLista />
          },
          {
            path: 'mod/:key',
            element: <ModuloForm />
          },
        ],
      }
    ]
  },
  {
    path: '/merchant/new',
    element: <MerchantFormMkt />
  },
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/login/rcy',
    element: <LoginRecovery />
  },
  {
    path: '/login/chg',
    element: <LoginChange />
  },
  {
    path: '/verify',
    element: <VerificaEmail />
  },
  {
    path: 'usr/auth/:merchantId/:token/:type',
    element: <UsuarioAuth />
  },
]);