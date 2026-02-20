import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  TextField,
  Button,
  Box,
  Alert,
  Autocomplete,
  TableContainer,
  TableBody,
  TableCell,
  TableHead,
  Grid,
  Paper,
  FormGroup,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { addDocument, fetchCollection, resizeToThumbnail, updateDocument, uploadImage, useMntUser } from './api';
import { useData } from './context';
import Tab from '@mui/material/Tab';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Checkbox from '@mui/material/Checkbox';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { NumericFormat } from 'react-number-format';
import { useEffect } from 'react';
import { ErrorDialog } from './shared';
import { useDialogs } from '@toolpad/core';






const usePdtFetcher = () => {
  const { setData } = useData();
  const { claims, loading } = useMntUser();
  const [state, setState] = useState({ fetching: true, error: null });


  useEffect(() => {
    if (loading || !claims?.merchantId) return;

    let unsubItem = undefined
    let unsubCtg = undefined
    let unsubKds = undefined
    let unsubOpt = undefined

    //items
    unsubItem = fetchCollection(claims.merchantId, 'item', null,
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
          mnt: {
            ...state.mnt,
            item: [...grouped]
          }
        }));
      },
      (error) => setState({ fetching: false, error })
    );

    //category
    unsubCtg = fetchCollection(claims.merchantId, 'category', null,
      (category) => {
        setData(state => ({
          ...state,
          mnt: { ...state.mnt, category }
        }));
        setState({ fetching: false, error: null });
      },
      (error) => setState({ fetching: false, error })
    );

    //kds
    unsubCtg = fetchCollection(claims.merchantId, 'kds', null,
      (kds) => {
        setData(state => ({
          ...state,
          mnt: { ...state.mnt, kds }
        }));
        setState({ fetching: false, error: null });
      },
      (error) => setState({ fetching: false, error })
    );

    //option
    unsubCtg = fetchCollection(claims.merchantId, 'option', null,
      (option) => {
        setData(state => ({
          ...state,
          mnt: { ...state.mnt, option }
        }));
        setState({ fetching: false, error: null });
      },
      (error) => setState({ fetching: false, error })
    );

    return () => {
      unsubItem?.();
      unsubCtg?.();
      unsubKds?.();
      unsubOpt?.();
    };
  }, [loading, claims, setData]);

  return { ...state, claims };
};





function ComplementosTabela({ optionGroup, setValue, getValues }) {

  const [selected, setSelected] = useState([]);

  //seleciona tudo do grupo
  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const prev = getValues('options') || [];
      setSelected([...optionGroup.options]);
      setValue('options', [...prev, ...optionGroup.options]);
      return;
    }

    setSelected([]);
    const prev = getValues('options') || [];
    const arr = prev.filter((o) => o.optionGroup.optionGroupId !== optionGroup.optionGroupId);
    setValue('options', arr);
    setValue('optionsGroup', arr);
  };


  //marca ou desmarca opcao selecionada
  const handleClick = (_, option) => {
    const selectedIndex = selected.findIndex((i) => i.optionId === option.optionId);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = [...selected, option];
    } else {
      newSelected = selected.filter((i) => i.optionId !== option.optionId);
    }

    setSelected(newSelected);

    const prev = getValues('options') || [];

    setValue('options', [...prev, ...newSelected]);

  };


  //carrega em caso de ediçao os options do item
  useEffect(() => {
    const selectedEditing = getValues('options') || [];

    if (!!selectedEditing.length) {
      //const optionsThisGroup = selectedEditing.filter((o) => o.optionGroup.optionGroupId === optionGroup.optionGroupId);
      const optionsThisGroup = selectedEditing.filter((o) => o.optionGroup.optionGroupId === optionGroup.optionId);

      setSelected(optionsThisGroup);
    }
  }, []);

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding='checkbox'>
              <Checkbox
                color='primary'
                indeterminate={selected.length > 0 && selected.length < optionGroup.options.length}
                checked={optionGroup.options.length > 0 && selected.length === optionGroup.options.length}
                onChange={handleSelectAllClick}
              />
            </TableCell>
            <TableCell colSpan={7} sx={{ pl: 0 }}>
              <Typography variant='h6'>
                {optionGroup.name}
              </Typography>
            </TableCell>
          </TableRow>
        </TableHead>


        <TableBody>
          {optionGroup.options.map((option, index) => {
            const isItemSelected = selected.findIndex((i) => i.optionId === option.optionId) !== -1;

            return (
              <TableRow
                hover
                onClick={(event) => handleClick(event, option)}
                role='checkbox'
                tabIndex={-1}
                key={option.optionId}
                selected={isItemSelected}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell padding='checkbox'>
                  <Checkbox
                    color='primary'
                    checked={isItemSelected}
                  />
                </TableCell>
                <TableCell
                  component='th'
                  scope='row'
                  padding='none'
                >
                  {option.name}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}




export default function ProdutoForm() {

  const params = useParams();

  const navigate = useNavigate();

  const dialogs = useDialogs();

  const [tab, setTab] = useState('1');

  const { data } = useData();

  const { fetching, error, claims } = usePdtFetcher();

  const optionGroupList = Object.values(
    data.mnt.option.reduce((acc, item) => {
      const { optionGroupId, name } = { optionGroupId: 'All', name: 'Todos' }

      if (!acc[optionGroupId]) {
        acc[optionGroupId] = { optionGroupId, name, options: [] };
      }

      acc[optionGroupId].options.push(item);
      return acc;
    }, {})
  );

  /*  const optionGroupList = Object.values(
    data.mnt.option.reduce((acc, item) => {
      const { optionGroupId, name } = item.optionGroup;

      if (!acc[optionGroupId]) {
        acc[optionGroupId] = { optionGroupId, name, options: [] };
      }

      acc[optionGroupId].options.push(item);
      return acc;
    }, {})
  ); */

  const kdsList = [{ name: 'Nenhum', id: '__null__' }, ...data.mnt.kds];

  const schema = z.object({
    name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
    status: z.boolean(), // novo campo para ativo/inativo
    category: z.object({
      categoryId: z.string().min(1, 'Obrigatório'),
      name: z.string().min(1, 'Obrigatório'),
      status: z.boolean(),
    }).nullable().refine(
      (val) => val && val.categoryId.trim() !== '' && val.name.trim() !== '',
      { message: 'Obrigatório' }
    ),
    description: z.string().optional(),
    additionalInformation: z.string().optional(),
    imagePath: z.string().optional(),
    price: z.object({
      value: z.number({ required_error: 'Preço é obrigatório' })
        .min(0.01, 'Preço maior que zero'),
    }),
    options: z.preprocess((val) => (Array.isArray(val) ? val : []), z.array(z.any())),
    optionGroup: z.preprocess((val) => (Array.isArray(val) ? val : []), z.array(z.any())),
    /* kds: z.object({
      kdsId: z.string().min(1, 'Obrigatório'),
      name: z.string().min(1, 'Obrigatório'),
    }).nullable().refine(
      (val) => val && val.kdsId.trim() !== '' && val.name.trim() !== '',
      { message: 'Obrigatório' }
    ), */
    kds: z.union([z.boolean(), z.object({
      kdsId: z.string(),
      name: z.string()
    })])
  });

  const {
    watch,
    setValue,
    getValues,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control
  } = useForm({
    resolver: zodResolver(schema),
    //mode: 'all',
    defaultValues: {
      name: '',
      status: true, // padrão ativo
      category: null,
      description: '',
      additionalInformation: '',
      serving: '',
      imagePath: '',
      price: {
        value: 0
      },
      options: [],
      optionGroup: [],
      kds: false
    },
  });

  const handleChangeTab = (event, newTab) => {
    setTab(newTab);
  };

  const handleFileChange = async (e) => {
    const image = e.target.files[0];
    if (!image) return;

    try {
      const thumbnail = await resizeToThumbnail(image, 200);

      const path = `${image.name}`;

      const imageUrl = await uploadImage(claims.merchantId, thumbnail, path, (p) => console.log(p));

      setValue('imagePath', imageUrl);
    } catch (err) {
      console.error('Erro ao gerar thumbnail:', err);
    }
  };

  //submit do formulario
  const onSubmit = async (data) => {
    try {
      /*  const optionGroupList = Object.values(
       data.options.reduce((acc, item) => {
        const { optionGroupId, name } = item.optionGroup;
        
        if (!acc[optionGroupId]) {
          acc[optionGroupId] = { optionGroupId, name, options: [] };
          }
          
          acc[optionGroupId].options.push(item);
          return acc;
          }, {})
     ); */

      //provisorio em teste sem grupo conf Conde, ver acima se quiser reverter
      const optionGroupList = Object.values(
        data.options.reduce((acc, item) => {
          const { optionGroupId, name } = { optionGroupId: 'All', name: 'Todos' }

          if (!acc[optionGroupId]) {
            acc[optionGroupId] = { optionGroupId, name, options: [] };
          }

          acc[optionGroupId].options.push(item);
          return acc;
        }, {})
      );

      const newData = {
        ...data,
        optionGroup: [...optionGroupList]
      }

      if (params.key !== '0') {
        await updateDocument(claims.merchantId, 'item', params.key, newData);
      } else {
        await addDocument(claims.merchantId, 'item', newData);
      }

      navigate(-1);
    } catch (error) {
      console.log('error', error)
      await dialogs.open(ErrorDialog, { textError: 'dados inválidos' });
    }

  };

  //verifica edição ou novo
  useEffect(() => {
    if (params.key !== '0') {
      const item_editing = data.mnt.item
        .flatMap((i) => i.items)
        .find((o) => o.itemId === params.key);

      if (item_editing) {
        Object.keys(item_editing).forEach((key) => {
          setValue(key, item_editing[key]);
        });
      }
    }
  }, [params.key, data.mnt.item, setValue])

  if (fetching) return <></>

  if (error) return (
    <Alert severity='error'>
      <Box whiteSpace='pre-line'>
        {error.message}
      </Box>
    </Alert>
  );

  return (
    <Grid container>
      <Box component='form' onSubmit={handleSubmit(onSubmit)} width={'100%'}>
        <Grid container size={12} direction={'column'}>

          <TabContext value={tab}>
            <Box sx={{ borderBottom: 1, borderTop: 1, borderColor: 'divider', flexGrow: 1 }}>
              <TabList onChange={handleChangeTab} aria-label='lab API tabs example'>
                <Tab label='Detalhes' value='1' />
                <Tab label='Complementos' value='2' />
              </TabList>
            </Box>

            <TabPanel value='1' sx={{ p: 0, pt: 2 }}>
              <Grid container size={12} spacing={2}>

                <Grid container size={{ xs: 12, sm: 4, md: 3, lg: 4 }}>
                  <Paper variant='outlined'
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      flexGrow: 1,
                      alignItems: 'center',
                      justifyContent: 'space-around',
                      border: (theme) => `1px solid ${theme.palette.mode === 'light'
                        ? 'rgba(0, 0, 0, 0.23)'
                        : 'rgba(255, 255, 255, 0.23)'}`,
                      p: 1
                    }}
                  >
                    <Button
                      fullWidth
                      variant='text'
                      component='label'
                      startIcon={<CloudUploadIcon />}
                    >
                      Imagem
                      <input type='file' hidden onChange={handleFileChange} accept='image/*' />
                    </Button>

                    {
                      watch('imagePath') &&
                      <img
                        src={watch('imagePath')}
                        alt='foto do produto'
                        style={{
                          width: '100%',
                          maxWidth: '176px',
                          maxHeight: '176px',
                          objectFit: 'contain',
                        }}
                      />
                    }
                  </Paper>
                </Grid>

                <Grid container size={{ xs: 12, sm: 8, md: 9, lg: 8 }}>
                  <Grid size={{ xs: 12, lg: 8 }}>
                    <TextField
                      fullWidth
                      autoComplete='off'
                      label='Nome do Item'
                      size='small'
                      {...register('name')}
                      error={!!errors.name}
                      helperText={errors.name?.message}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, lg: 4 }}>
                    <Controller
                      name='category'
                      control={control}
                      render={({ field, fieldState }) => (
                        <Autocomplete
                          disablePortal
                          options={data.mnt.category}
                          getOptionLabel={(c) => c?.name || ''}
                          value={field.value || null}
                          onChange={(_, value) => field.onChange(value)}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label='Categoria'
                              size='small'
                              error={!!fieldState.error}
                              helperText={fieldState.error?.message}
                            />
                          )}
                        />
                      )}
                    />
                  </Grid>

                  <Grid size={12}>
                    <TextField
                      fullWidth
                      autoComplete='off'
                      label='Descrição'
                      size='small'
                      {...register('description')}
                      error={!!errors.description}
                      helperText={errors.description?.message}
                    />
                  </Grid>

                  <Grid size={12}>
                    <TextField
                      fullWidth
                      autoComplete='off'
                      label='Informações adicionais'
                      size='small'
                      {...register('additionalInformation')}
                      error={!!errors.additionalInformation}
                      helperText={errors.additionalInformation?.message}
                    />
                  </Grid>

                  <Grid size={6}>
                    {/*  <Controller
                      name='kds'
                      control={control}
                      render={({ field, fieldState }) => (
                        <Autocomplete
                          disablePortal
                          options={data.mnt.kds}
                          getOptionLabel={(c) => c?.name || ''}
                          value={field.value || null}
                          onChange={(_, value) => field.onChange(value)}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label='Exibir no Display'
                              size='small'
                              error={!!fieldState.error}
                              helperText={fieldState.error?.message}
                            />
                          )}
                        />
                      )}
                    /> */}

                    <Controller
                      name='kds'
                      control={control}
                      render={({ field, fieldState }) => (
                        <Autocomplete
                          disablePortal
                          options={kdsList}
                          getOptionLabel={(c) => c?.name || ''}
                          value={field.value || kdsList[0]}
                          onChange={(_, value) => {
                            if (!value || value.id === '__null__') {
                              field.onChange(false);
                            } else {
                              field.onChange(value);
                            }
                          }}

                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label='Exibir no Display'
                              size='small'
                              error={!!fieldState.error}
                              helperText={fieldState.error?.message}
                            />
                          )}
                        />
                      )}
                    />
                  </Grid>

                  {/* Status (Ativo/Inativo) no estilo do formulário de usuários */}
                  <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <Controller
                      name='status'
                      control={control}
                      render={({ field, fieldState }) => (
                        <FormGroup>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={!!field.value}
                                onChange={(e) => field.onChange(e.target.checked)}
                              />
                            }
                            label='Ativo'
                          />
                          {fieldState.error && (
                            <Typography variant='caption' color='error'>
                              {fieldState.error.message}
                            </Typography>
                          )}
                        </FormGroup>
                      )}
                    />
                  </Grid>

                  <Grid size={12}>
                    <Controller
                      name='price.value'
                      control={control}
                      rules={{ required: true }}
                      render={({ field }) => (
                        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                          <NumericFormat
                            fullWidth
                            customInput={TextField}
                            prefix='R$ '
                            thousandSeparator='.'
                            decimalSeparator=','
                            decimalScale={2}
                            fixedDecimalScale
                            allowNegative={false}
                            size='small'
                            type='tel'
                            autoComplete='off'
                            label='Preço'
                            value={field.value ?? ''}
                            error={!!errors?.price?.value}
                            helperText={errors?.price?.value?.message}
                            onValueChange={({ floatValue }) => {
                              field.onChange(floatValue ?? null);
                            }}
                          />
                        </Grid>
                      )}
                    />
                  </Grid>
                </Grid>

              </Grid>
            </TabPanel>

            {/* ABA COMPLEMENTOS */}
            <TabPanel value='2' sx={{ p: 0 }}>
              <Grid container size={12} spacing={2}>

                {
                  !optionGroupList.length ?
                    <Typography variant='body1' mt={2} color='textSecondary'>Nenhum complemento cadastrado.</Typography>
                    :
                    optionGroupList.map((g) => (
                      <ComplementosTabela
                        key={g.optionGroupId}
                        optionGroup={g}
                        setValue={setValue}
                        getValues={getValues}
                      />
                    ))
                }

              </Grid>
            </TabPanel>
          </TabContext>


          <Grid container size={12} spacing={2} mt={2}>
            <Grid size={{ xs: 12, sm: 4, md: 3, lg: 2 }}>
              <Button
                fullWidth
                type='submit'
                variant='contained'
                disabled={isSubmitting}
              >
                Salvar
              </Button>
            </Grid>

            <Grid size={{ xs: 12, sm: 4, md: 3, lg: 2 }}>
              <Button
                fullWidth
                variant='contained'
                color='secondary'
                onClick={() => navigate(-1)}
              >
                Voltar
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </Box >
    </Grid>
  );
}
