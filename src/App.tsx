import { AppProvider, useApp } from './lib/store';
import { Overlays } from './components/Overlays';
import { Home } from './pages/Home';
import { Collections } from './pages/Collections';
import { NoteDetail } from './pages/NoteDetail';
import { OriginalNote } from './pages/OriginalNote';
import { DianDian } from './pages/DianDian';
import { ConditionsPage } from './pages/Conditions';
import { PlanPage } from './pages/Plan';
import { CookingPage } from './pages/Cooking';
import { HomeworkPage } from './pages/Homework';

import { Profile } from './pages/Profile';

function Router() {
  const { state } = useApp();
  const r = state.route;
  switch (r.name) {
    case 'profile': return <Profile />;
    case 'home': return <Home />;
    case 'collections': return <Collections />;
    case 'original-note': return <OriginalNote recipeId={r.recipeId} />;
    case 'note': return <NoteDetail recipeId={r.recipeId} />;
    case 'chat': return <DianDian />;
    case 'conditions': return <ConditionsPage recipeId={r.recipeId} source={r.source} chatHints={r.chatHints} replicaId={r.replicaId} />;
    case 'plan': return <PlanPage planId={r.planId} />;
    case 'cook': return <CookingPage planId={r.planId} />;
    case 'homework': return <HomeworkPage planId={r.planId} />;
    default: return <Home />;
  }
}

export default function App() {
  return (
    <AppProvider>
      <div className="app-shell">
        <div className="phone">
          <Router />
          <Overlays />
        </div>
      </div>
    </AppProvider>
  );
}


