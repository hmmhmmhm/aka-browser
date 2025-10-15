declare global {
  interface Window {
    electronAPI?: {
      closeWindow: () => void;
      minimizeWindow: () => void;
      maximizeWindow: () => void;
    };
  }
}

function WindowControls() {
  const handleClose = () => {
    window.electronAPI?.closeWindow();
  };

  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow();
  };

  const handleMaximize = () => {
    window.electronAPI?.maximizeWindow();
  };

  return (
    <div className="flex gap-2 items-center [-webkit-app-region:no-drag]">
      <button
        onClick={handleClose}
        className="w-3 h-3 rounded-full border-none bg-[#ff5f57] cursor-pointer transition-all duration-200 relative hover:before:content-[''] hover:before:absolute hover:before:top-1/2 hover:before:left-1/2 hover:before:-translate-x-1/2 hover:before:-translate-y-1/2 hover:before:w-[6px] hover:before:h-[6px] hover:before:bg-transparent hover:before:border-none hover:after:content-['×'] hover:after:absolute hover:after:top-1/2 hover:after:left-1/2 hover:after:-translate-x-1/2 hover:after:-translate-y-1/2 hover:after:text-[10px] hover:after:text-[rgba(0,0,0,0.7)] hover:after:font-bold"
      />
      <button
        onClick={handleMinimize}
        className="w-3 h-3 rounded-full border-none bg-[#ffbd2e] cursor-pointer transition-all duration-200 relative hover:before:content-[''] hover:before:absolute hover:before:top-1/2 hover:before:left-1/2 hover:before:-translate-x-1/2 hover:before:-translate-y-1/2 hover:before:w-[6px] hover:before:h-px hover:before:bg-[rgba(0,0,0,0.6)]"
      />
      <button
        onClick={handleMaximize}
        className="w-3 h-3 rounded-full border-none bg-[#28c840] cursor-pointer transition-all duration-200 relative hover:before:content-[''] hover:before:absolute hover:before:top-1/2 hover:before:left-1/2 hover:before:-translate-x-1/2 hover:before:-translate-y-1/2 hover:before:w-[5px] hover:before:h-[5px] hover:before:border hover:before:border-[rgba(0,0,0,0.6)] hover:before:rounded-[1px] hover:before:bg-transparent"
      />
    </div>
  );
}

export default WindowControls;
