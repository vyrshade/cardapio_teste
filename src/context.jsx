import { createContext, useState, useContext } from 'react';


const DataContext = createContext();

const initial_state = {
  name: '',
  mnu: {
    item: [],
    item_categorized: [],
    order: [],
    order_status: [],
    checkIn: [],
    checkout: []
  },
  kds: {
    name: '',
    order: [],
    order_hist: [],
    order_status: [],
  },
  wtr: {
    name: '',
    order: [],
    order_hist: [],
    order_status: [],
    order_kds_show: false,
    order_my_action_show: false,
    help: [],
    checkIn: [],
    checkout: [],
    table: {
      numStart: 0,
      numEnd: 0
    },
  },
  mnt: {
    category: [],
    //product: [],
    option: [],
    optionGroup: [],
    order: [],
    item: [],
    kds: [],
    order_status: [],
    table: {
      numStart: 0,
      numEnd: 0
    },
    user: [],
    adm: {
      subscription: [],
      payment: [],
    },
  },
  ////////
  adm: {
    mct: [],
    payment: [],
    module: [],
  },
}

export const DataProvider = ({ children }) => {

  const [data, setData] = useState({ ...initial_state });

  return (
    <DataContext.Provider value={{ data, setData }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);