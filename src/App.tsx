import { Route, Routes } from 'react-router-dom';
import { OnboardingGate } from './features/onboarding/OnboardingGate';
import { AddPlantFlow } from './features/add-plant/AddPlantFlow';
import { MyPlantsScreen } from './features/plants/MyPlantsScreen';
import { PlantDetailScreen } from './features/plants/PlantDetailScreen';
import { EditPotScreen } from './features/plants/EditPotScreen';
import { CustomScheduleScreen } from './features/plants/CustomScheduleScreen';
import { SitesScreen } from './features/sites/SitesScreen';
import { SiteDetailScreen } from './features/sites/SiteDetailScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { InstallPrompt } from './features/install/InstallPrompt';
import { IOSInstallHint } from './features/install/IOSInstallHint';
import { UpdateToast } from './features/install/UpdateToast';
import { TodayScreen } from './features/today/TodayScreen';
import { SpeciesLibraryScreen } from './features/species/SpeciesLibraryScreen';
import { CustomSpeciesForm } from './features/species/CustomSpeciesForm';
import { FertilizersScreen } from './features/fertilizers/FertilizersScreen';
import { FertilizerForm } from './features/fertilizers/FertilizerForm';

export default function App() {
  return (
    <OnboardingGate>
      <InstallPrompt />
      <IOSInstallHint />
      <UpdateToast />
      <Routes>
        <Route path="/" element={<TodayScreen />} />
        <Route path="/add" element={<AddPlantFlow />} />
        <Route path="/plants/:potId" element={<PlantDetailScreen />} />
        <Route path="/plants/:potId/edit" element={<EditPotScreen />} />
        <Route
          path="/plants/:potId/schedule"
          element={<CustomScheduleScreen />}
        />
        <Route path="/plants" element={<MyPlantsScreen />} />
        <Route path="/sites" element={<SitesScreen />} />
        <Route path="/sites/:siteId" element={<SiteDetailScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/species" element={<SpeciesLibraryScreen />} />
        <Route path="/species/new" element={<CustomSpeciesForm />} />
        <Route
          path="/species/:speciesId/edit"
          element={<CustomSpeciesForm />}
        />
        <Route path="/fertilizers" element={<FertilizersScreen />} />
        <Route path="/fertilizers/new" element={<FertilizerForm />} />
        <Route
          path="/fertilizers/:fertilizerId/edit"
          element={<FertilizerForm />}
        />
      </Routes>
    </OnboardingGate>
  );
}
