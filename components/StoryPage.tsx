import React, { useState, useRef } from 'react';
import { StoryPage as StoryPageType } from '../types';
import { Wand2, RefreshCw, Edit, Download, Loader2, Volume2, PauseCircle } from 'lucide-react';
import html2canvas from 'html2canvas';

interface StoryPageProps {
  page: StoryPageType;
  totalPageCount: number;
  onEditImage: (pageIndex: number, prompt: string) => void;
  onPlayAudio: (pageIndex: number) => void;
  pageIndex: number;
  translations: any;
}

const StoryPage: React.FC<StoryPageProps> = ({ page, totalPageCount, onEditImage, onPlayAudio, pageIndex, translations: t }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editPrompt.trim()) {
      onEditImage(pageIndex, editPrompt);
      setIsEditing(false);
      setEditPrompt('');
    }
  };

  const handleDownload = async () => {
    if (!pageRef.current) return;
    
    try {
      setIsDownloading(true);
      const canvas = await html2canvas(pageRef.current, {
        scale: 2, // Higher quality
        useCORS: true,
        backgroundColor: null, // Transparent background to capture current theme colors
        logging: false,
      });
      
      const link = document.createElement('a');
      link.download = `story-page-${page.pageNumber}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download page:', err);
      alert('Failed to download page image.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="relative group/page w-full max-w-6xl mx-auto">
       {/* Top Controls: Audio & Download - Absolute on desktop, relative flex on mobile for better touch targets */}
       <div className="flex justify-end gap-2 mb-2 md:absolute md:-top-12 md:right-0 md:mb-0 z-10">
         
         {/* Audio Button */}
         <button
            onClick={() => onPlayAudio(pageIndex)}
            disabled={page.isGeneratingAudio}
            className={`flex items-center gap-2 px-3 py-1.5 backdrop-blur text-sm font-medium rounded-full shadow-sm hover:shadow-md transition-all disabled:opacity-50 ${
                page.isGeneratingAudio 
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200' 
                : 'bg-white/80 dark:bg-black/60 hover:bg-white dark:hover:bg-black/80 text-gray-700 dark:text-gray-200'
            }`}
            title={t.readAloud}
            data-html2canvas-ignore
         >
           {page.isGeneratingAudio ? (
               <>
                <Loader2 size={16} className="animate-spin" />
                <span className="hidden sm:inline">{t.playing}</span>
               </>
           ) : (
               <>
                <Volume2 size={16} />
                <span className="hidden sm:inline">{t.readAloud}</span>
               </>
           )}
         </button>

         {/* Download Button */}
         <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/80 dark:bg-black/60 hover:bg-white dark:hover:bg-black/80 backdrop-blur text-gray-700 dark:text-gray-200 text-sm font-medium rounded-full shadow-sm hover:shadow-md transition-all disabled:opacity-50"
            title={t.save}
            data-html2canvas-ignore
         >
           {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
           <span className="hidden sm:inline">{t.save}</span>
         </button>
       </div>

      <div 
        ref={pageRef}
        className="flex flex-col-reverse md:flex-row bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden w-full border border-gray-200 dark:border-gray-700 transition-colors duration-300 min-h-[calc(100vh-160px)] md:min-h-0 md:h-[600px]"
      >
        {/* Text Side (Left on Desktop, Bottom on Mobile) */}
        <div className="w-full md:w-1/2 p-6 md:p-12 flex flex-col justify-center bg-[#fffbf0] dark:bg-[#1a1a1a] relative border-t md:border-t-0 md:border-r border-gray-200 dark:border-gray-700 transition-colors duration-300 flex-grow md:flex-grow-0">
          <div className="absolute top-2 left-4 md:top-4 text-gray-400 dark:text-gray-500 font-serif text-xs md:text-sm select-none">
            {t.page} {page.pageNumber} {t.of} {totalPageCount}
          </div>
          
          <div className="prose prose-lg prose-p:font-serif prose-p:text-gray-800 dark:prose-p:text-gray-200 prose-p:leading-loose mt-4 md:mt-0 overflow-y-auto max-h-[40vh] md:max-h-none">
            <p className="whitespace-pre-wrap text-lg md:text-2xl">{page.text}</p>
          </div>
        </div>

        {/* Image Side (Right on Desktop, Top on Mobile) */}
        <div className="w-full md:w-1/2 bg-gray-100 dark:bg-gray-900 flex items-center justify-center relative group transition-colors duration-300 h-[40vh] md:h-full shrink-0">
          {page.imageUrl ? (
            <>
              <img 
                src={page.imageUrl} 
                alt={`Illustration for page ${page.pageNumber}`}
                className="w-full h-full object-cover"
              />
              {/* Edit Controls Overlay - Hidden during capture */}
              <div 
                className="absolute bottom-4 right-4 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"
                data-html2canvas-ignore
              >
                 <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className="bg-white/90 dark:bg-gray-800/90 backdrop-blur text-gray-800 dark:text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full shadow-lg flex items-center gap-2 hover:bg-white dark:hover:bg-gray-800 transition-colors text-xs md:text-sm font-semibold border border-gray-200 dark:border-gray-600"
                >
                  <Edit size={14} className="md:w-4 md:h-4" />
                  {t.edit}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center p-6">
              {page.isGeneratingImage ? (
                <div className="flex flex-col items-center animate-pulse">
                  <Wand2 className="w-8 h-8 md:w-12 md:h-12 text-purple-500 mb-2 md:mb-4 animate-bounce" />
                  <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 font-medium">{t.painting}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center text-gray-400 dark:text-gray-600">
                  <p className="text-sm md:text-base">{t.waiting}</p>
                </div>
              )}
            </div>
          )}

          {/* Edit Modal / Popover - Hidden during capture */}
          {isEditing && (
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-10"
              data-html2canvas-ignore
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold mb-2 text-gray-800 dark:text-white">{t.editTitle}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  {t.editDesc}
                </p>
                <form onSubmit={handleEditSubmit}>
                  <textarea
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-sm mb-4 focus:ring-2 focus:ring-purple-500 outline-none resize-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
                    rows={3}
                    placeholder={t.editPlaceholder}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button 
                      type="button" 
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    >
                      {t.cancel}
                    </button>
                    <button 
                      type="submit"
                      className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2"
                    >
                      <RefreshCw size={14} />
                      {t.regenerate}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryPage;