// creators-hub/js/components/ProjectView/ShotListViewer.js

window.ShotListViewer = ({ video, project, settings, onUpdateTask, onRegenerate, stagedScenes, onIntegrateScene }) => {
  const { React } = window;
  const { useState, useEffect } = React;

  // The main shot list data is now directly from the video prop.
  const shotListData = video.tasks?.shotList || [];

  // --- Drag and Drop Handlers ---

  /**
   * Handles the start of a drag event for a staged scene.
   * @param {React.DragEvent} e - The drag event object.
   * @param {object} scene - The scene object being dragged.
   */
  const handleDragStart = (e, scene) => {
    // Set the data to be transferred, using a JSON string to hold the scene object.
    e.dataTransfer.setData("application/json", JSON.stringify(scene));
    e.dataTransfer.effectAllowed = "move";
  };

  /**
   * Prevents the default handling of the element being dragged over.
   * This is necessary to allow a drop.
   * @param {React.DragEvent} e - The drag event object.
   */
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  /**
   * Handles the drop event, integrating the scene into the main shot list.
   * @param {React.DragEvent} e - The drag event object.
   * @param {number} insertAtIndex - The index where the new scene should be inserted.
   */
  const handleDrop = (e, insertAtIndex) => {
    e.preventDefault();
    // Retrieve the scene data from the drag event.
    const scene = JSON.parse(e.dataTransfer.getData("application/json"));
    // Call the parent component's function to handle the integration logic.
    onIntegrateScene(scene, insertAtIndex);
  };

  // --- Reusable Rendering Logic ---

  /**
   * Renders a table for a list of shots.
   * @param {Array<object>} shots - The array of shot objects to render.
   * @returns {JSX.Element} - The rendered table element.
   */
  const renderShotListTable = (shots) => (
    <div className="overflow-x-auto rounded-lg shadow-inner bg-gray-900/30">
      <table className="w-full text-sm text-left text-gray-300">
        <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase sticky top-0 z-10">
          <tr>
            <th scope="col" className="px-4 py-3">Type</th>
            <th scope="col" className="px-4 py-3 w-1/2">Dialogue / Cue</th>
            <th scope="col" className="px-4 py-3">Location</th>
            <th scope="col" className="px-4 py-3">Visuals</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {shots.map((row, index) => (
            <tr
              key={row.id || index}
              className={`hover:bg-gray-800/50 ${row.shotType === 'On-Camera' ? 'bg-blue-900/30' : 'bg-gray-800/20'}`}
              // Each row in the main list is a drop target.
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
            >
              <td className="px-4 py-4 font-medium align-top">
                <span className={`px-2 py-1 text-xs font-bold rounded-full ${row.shotType === 'On-Camera' ? 'text-blue-300 bg-blue-800/50' : 'text-green-300 bg-green-800/50'}`}>
                  {row.shotType}
                </span>
              </td>
              <td className="px-4 py-4 whitespace-pre-wrap">{row.dialogue}</td>
              <td className="px-4 py-4 align-top">{row.location}</td>
              <td className="px-4 py-4 align-top">{row.visuals}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // --- Main Component Render ---

  return (
    <div className="p-1 space-y-6">
      {/* Main Shot List */}
      <div 
        className="space-y-1"
        // This outer div acts as a drop target for appending to the end of the list.
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, shotListData.length)}
      >
        {shotListData.length > 0 ? (
          renderShotListTable(shotListData)
        ) : (
          <div className="text-center py-10 px-4 text-gray-400 bg-gray-800/40 rounded-lg">
            <p className="font-bold">Your shot list is empty.</p>
            <p>Generate a shot list from the "Scripting" task, or use the "Add Scene" button to start building one.</p>
          </div>
        )}
      </div>

      {/* Staged Scenes Area */}
      {stagedScenes && stagedScenes.length > 0 && (
        <div>
          <h4 className="text-lg font-bold text-amber-400 mb-3">Staged Scenes</h4>
          <p className="text-sm text-gray-400 mb-3">Drag a staged scene and drop it onto the main shot list above to integrate it.</p>
          <div className="space-y-4">
            {stagedScenes.map((scene) => (
              <div
                key={scene.id}
                draggable
                onDragStart={(e) => handleDragStart(e, scene)}
                className="p-4 bg-gray-800/60 border border-dashed border-amber-500 rounded-lg cursor-grab active:cursor-grabbing"
              >
                {renderShotListTable(scene.shots)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
