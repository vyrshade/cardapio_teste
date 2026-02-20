import { Grid, Typography } from '@mui/material';
import { ListItemAvatar, ListItemButton, Paper, Stack, Tab, Tabs, Zoom } from '@mui/material';
import { useNavigate, useParams } from 'react-router';
import { useData } from './context';
import List from '@mui/material/List';
import { fetchCollection, useWtrUser } from './api';
import ProductImage from './shared';
import { useState } from 'react';
import { useEffect } from 'react';






//PASSAR A LIMPO
const DataFetcher = () => {
  const { setData } = useData();

  const [error, setError] = useState(null);

  const params = useParams();

  const { loading, user } = useWtrUser()




  useEffect(() => {

    //provisorio.. limpa o estado antes.. REMOVER
    setData((state) => ({
      ...state,
      mnu: {
        ...state.mnu,
        order: [],
      }
    }));

    if (loading || !user) return undefined;

    const unsubscribe = fetchCollection(params.merchantId,
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

      },
      (error) => {
        setError(error);
      }
    );

    return () => unsubscribe();

  }, [setData, user, loading, params.tableId]);




  //busca os itens para popular o cardapio
  useEffect(() => {
    const unsubscribe = fetchCollection(params.merchantId, 'item', null,
      (dataItem) => {
        const grouped = Object.values(
          dataItem.reduce((acc, item) => {
            const { categoryId, name, status } = item.category;

            if (!status) return acc;

            if (!acc[categoryId]) {
              acc[categoryId] = { categoryId, name, items: [] };
            }

            acc[categoryId].items
              .filter(c => c.category.status === categoryStatus)
              .push(item);
            return acc;
          }, {})
        );

        //atualiza o estado
        setData((state) => ({
          ...state,
          mnu: {
            ...state.mnu,
            item: [...dataItem],
            item_categorized: [...grouped]
            //item: [...grouped]
          }
        }));

      },
      (error) => {
        setError(error);
      }
    );

    return () => unsubscribe();
  }, [setData]);

  if (error) return <div>Error: {error.message}</div>;

  return null;
};






export default function GarçomCardapio() {
  const navigate = useNavigate();

  const { data } = useData();

  const [selectedTab, setSelectedTab] = useState(0);

  const [filteredItems, setFilteredItems] = useState([]);

  //tab filtra categoria
  const handleChange = (_, newValue) => {
    setSelectedTab(newValue);

    if (newValue === 0) {
      setFilteredItems(data.mnu.item.filter(i => i.category.status));
    } else {
      const selectedCategoryKey = data.mnu.item_categorized[newValue - 1].categoryId;

      const filtered = data.mnu.item.filter(item => item.category.categoryId === selectedCategoryKey);
      setFilteredItems(filtered);
    }
  };



  useEffect(() => {
    setFilteredItems(data.mnu.item.filter(i => i.category.status))
  }, [data.mnu.item])

  return (
    <Grid container
      sx={{
        p: 0,
        flexDirection: 'column',
        flexGrow: 1,
        justifyContent: 'space-between'
      }}
    >


      <DataFetcher />


      <Grid container size={12}>
        <Grid size={12}>
          <Paper variant='outlined'>
            <Tabs
              value={selectedTab}
              variant='scrollable'
              scrollButtons='auto'
              textColor='primary'
              indicatorColor='primary'
              onChange={handleChange}
            >
              <Tab
                label='Tudo'
              />
              {data.mnu.item_categorized.map((row) => (
                <Tab
                  key={row.categoryId}
                  label={<Typography variant='body2'>{row.name}</Typography>}
                />
              ))}
            </Tabs>
          </Paper>
        </Grid>


        <Zoom in={true} timeout={200}>
          <List dense disablePadding
            sx={{
              mt: 1,
              mb: (th) => th.mixins.toolbar.minHeight / 8,
              overflowY: 'auto',
              width: '100%'
            }}
          >
            {//data.mnu.item
              [...(filteredItems || [])]
                .map((row) => (
                  <Paper key={row.itemId} variant='outlined' sx={{ mb: 1 }}>
                    <ListItemButton
                      onClick={() => navigate(`item/${row.itemId}`)}
                    >
                      <ListItemAvatar sx={{ pr: 2 }}>
                        <ProductImage imagePath={row.imagePath} alt={row.name} w={'125px'} h={'125px'} />
                      </ListItemAvatar>
                      <Stack>
                        <Typography variant='h6' color='text.primary'>{row.name}</Typography>
                        <Typography variant='body2' color='text.secondary'>{row.description}</Typography>
                        <Typography variant='body2' color='text.secondary'>{row.additionalInformation}</Typography>
                        <Typography variant='body2' color='text.secondary' mt={2}>{row.serving}</Typography>
                        <Stack direction={'row'}>
                          <Typography variant='body2' color='success' mt={2}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.price.value)}
                          </Typography>
                          {
                            row.price.originalValue > 0 &&
                            <Typography variant='body2' color='text.secondary' mt={2} ml={2} style={{ textDecoration: 'line-through' }}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.price.originalValue)}
                            </Typography>
                          }
                        </Stack>
                      </Stack>
                    </ListItemButton>
                  </Paper>
                ))}
          </List>
        </Zoom>
      </Grid>
    </Grid>
  );
}