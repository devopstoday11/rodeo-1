import _ from 'lodash';
import React from 'react';
import Immutable from 'seamless-immutable';
import {Provider} from 'react-redux';
import client from '../services/jupyter/client';
import FullScreen from '../components/full-screen/full-screen.jsx';
import StudioLayout from './studio-layout/studio-layout.jsx';
import Sidebar from '../components/sidebar/sidebar.jsx';
import ModalDialogViewer from './modal-dialog-viewer/modal-dialog-viewer.jsx';
import NotificationsContainer from '../components/notifications/notifications-container.jsx';
import rootReducer from './main.reducer';
import initialState from './main.initial';
import ipcDispatcher from '../services/ipc-dispatcher';
import dialogActions from '../actions/dialogs';
import applicationControl from '../services/application-control';
import reduxStore from '../services/redux-store';
import {local} from '../services/store';
import text from './text.yml';

function clearPlots(state) {
  const groups = state.freeTabGroups;

  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    const tabs = groups[groupIndex].tabs;

    for (let tabIndex = 0; tabIndex < tabs.length; tabIndex++) {
      const tab = tabs[tabIndex];

      if (tab.contentType === 'plot-viewer') {
        tab.content.plots = [];
      }
    }
  }
}

function clearModalDialogs(state) {
  state.modalDialogs = [];
}

// take the state from what we're already been given, or start fresh with initialState
const lastSavedAppState = local.get('lastSavedAppState');
let state, store;

if (lastSavedAppState) {
  // plots are temp files, so they can't be restored
  clearPlots(lastSavedAppState);
  clearModalDialogs(lastSavedAppState);

  state = _.mapValues(lastSavedAppState, value => Immutable(value));
} else {
  state = window.__PRELOADED_STATE__ || initialState.getState();
}
store = reduxStore.create(rootReducer, state);

ipcDispatcher(store.dispatch);

// find the kernel immediately
store.dispatch(dialogActions.showRegisterRodeo());

// no visual for this please
applicationControl.checkForUpdates();

// try and start an instance of the python client
client.guaranteeInstance();

/**
 * Expose the global application state/store in two ways:
 * a) connect() from 'react-redux' (i.e. containers)
 * b) this.context.store for components that explictly ask for it (i.e., SplitPane component to broadcast)
 *
 * @class Main
 * @extends ReactComponent
 */
export default React.createClass({
  displayName: 'Main',
  childContextTypes: {
    store: React.PropTypes.object.isRequired,
    text: React.PropTypes.object.isRequired
  },
  getChildContext: function () {
    return {store, text};
  },
  render: function () {
    return (
      <Provider store={store}>
        <FullScreen row>
          <StudioLayout />
          <Sidebar />
          <ModalDialogViewer />
          <NotificationsContainer />
        </FullScreen>
      </Provider>
    );
  }
});
