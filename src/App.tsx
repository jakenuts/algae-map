import React from 'react';
import './App.css';
import AlgaeBloomMap from './features/algaeBloom/AlgaeBloomMap';

const App: React.FC = () => {
  return (
    <div className="App">
      <main className="App-main">
        <AlgaeBloomMap />
      </main>
    </div>
  );
};

export default App;
