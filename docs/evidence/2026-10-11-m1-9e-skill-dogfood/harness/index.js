import React, {useState} from 'react';
import {registerRootComponent} from 'expo';
import {SafeAreaView, Text, View} from 'react-native';
import {App} from './src/App';
function Dogfood() {
  const [actions, setActions] = useState(0);
  return <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}><View style={{padding: 24, gap: 16}}>
    <Text style={{fontSize: 20, color: '#18202b'}}>Crumbs 1.1.1 skill dogfood</Text>
    <App onActionPress={() => setActions(value => value + 1)} />
    <Text testID="dogfood-actions" style={{color: '#18202b'}}>Actions: {actions}</Text>
  </View></SafeAreaView>;
}
registerRootComponent(Dogfood);
