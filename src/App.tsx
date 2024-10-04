import React from 'react';
import './App.css';
import AlgaeBloomMap from './features/algaeBloom/AlgaeBloomMap';

const App: React.FC = () => {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Algae Bloom Map</h1>
      </header>
      <main>
        <AlgaeBloomMap />
      </main>
    </div>
  );
};

export default App;
