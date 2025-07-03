// creators-hub/js/components/ProjectView/AddSceneModal.js
const { useState, useEffect } = React;

window.AddSceneModal = ({
  isOpen,
  onClose,
  onStageScene,
  googleMapsLoaded,
}) => {
  const [newLocation, setNewLocation] = useState(null);
  const [onCameraDialogue, setOnCameraDialogue] = useState("");
  const [integrationNote, setIntegrationNote] = useState("");

  if (!isOpen) return null;

  const handleStageClick = () => {
    onStageScene({
      newLocation,
      onCameraDialogue,
      integrationNote,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4"
      style={{ zIndex: 1500 }}
    >
      <div className="glass-card rounded-lg p-8 w-full max-w-lg">
        <h3 className="text-2xl font-bold text-white mb-4">Add New Scene</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              New Location
            </label>
            {googleMapsLoaded ? (
              <window.LocationSearchInput
                onLocationsChange={(locs) => setNewLocation(locs[0] || null)}
                existingLocations={newLocation ? [newLocation] : []}
              />
            ) : (
              <window.MockLocationSearchInput />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              On-Camera Dialogue (Optional)
            </label>
            <textarea
              value={onCameraDialogue}
              onChange={(e) => setOnCameraDialogue(e.target.value)}
              rows="3"
              className="w-full form-textarea"
              placeholder="Enter any dialogue spoken directly to the camera."
            ></textarea>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Integration Note
            </label>
            <textarea
              value={integrationNote}
              onChange={(e) => setIntegrationNote(e.target.value)}
              rows="2"
              className="w-full form-textarea"
              placeholder="e.g., 'This scene should come after the market...'"
            ></textarea>
          </div>
        </div>
        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleStageClick}
            className="px-6 py-2 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold"
          >
            Stage Scene
          </button>
        </div>
      </div>
    </div>
  );
};
