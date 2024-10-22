import type { FC, ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import { json } from "@remix-run/cloudflare";
import { useActionData, Form, useNavigation, useLoaderData } from "@remix-run/react";
import type { ActionFunction, LoaderFunction } from "@remix-run/cloudflare";
import { createAppContext } from "../context";

export const loader: LoaderFunction = async ({ context }) => {
  const appContext = createAppContext(context);
  const { config } = appContext;
  const models = Object.entries(config.CUSTOMER_MODEL_MAP).map(([id, path]) => ({ id, path }));
  return json({ models, config });
};

export const action: ActionFunction = async ({ request, context }) => {
  const appContext = createAppContext(context);
  const { imageGenerationService, config } = appContext;

  const formData = await request.formData();
  const prompt = formData.get("prompt") as string;
  const enhance = formData.get("enhance") === "true";
  const modelId = formData.get("model") as string;
  const size = formData.get("size") as string;
  const numSteps = parseInt(formData.get("numSteps") as string, 10);

  if (!prompt) {
    return json({ error: "未找到提示詞" }, { status: 400 });
  }

  const model = config.CUSTOMER_MODEL_MAP[modelId];
  if (!model) {
    return json({ error: "無效的模型" }, { status: 400 });
  }

  try {
    const result = await imageGenerationService.generateImage(
      enhance ? `---tl ${prompt}` : prompt,
      model,
      size,
      numSteps
    );
    return json(result);
  } catch (error) {
    console.error("產生圖片時發生錯誤:", error);
    if (error instanceof AppError) {
      return json({ error: `產生圖片失敗: ${error.message}` }, { status: error.status || 500 });
    }
    return json({ error: "產生圖片失敗: 未知錯誤" }, { status: 500 });
  }
};

const GenerateImage: FC = () => {
  const { models, config } = useLoaderData<typeof loader>();
  const [prompt, setPrompt] = useState("");
  const [enhance, setEnhance] = useState(false);
  const [model, setModel] = useState(config.CUSTOMER_MODEL_MAP["FLUX.1-Schnell-CF"]);
  const [size, setSize] = useState("1024x1024");
  const [numSteps, setNumSteps] = useState(config.FLUX_NUM_STEPS);
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === "submitting";

  const handleEnhanceToggle = () => {
    setEnhance(!enhance);
  };

  const handleReset = () => {
    setPrompt("");
    setEnhance(false);
    setModel(config.CUSTOMER_MODEL_MAP["FLUX.1-Schnell-CF"]);
    setSize("1024x1024");
    setNumSteps(config.FLUX_NUM_STEPS);
  };

  const handlePromptChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPrompt(e.target.value);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (isSubmitting) {
      e.preventDefault();
    }
  };

  const handleModelChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setModel(e.target.value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden">
          {/* 標題區塊 */}
          <div className="bg-gradient-to-r from-purple-500/50 to-pink-500/50 p-8 text-center">
            <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
              AI 圖片產生器
            </h1>
            <p className="text-purple-100 text-lg">
              使用 Flux 技術，將您的想法轉化為獨特圖像
            </p>
          </div>

          {/* 主要表單區塊 */}
          <div className="p-8">
            <Form 
              method="post" 
              className="space-y-6"
              onSubmit={handleSubmit}
            >
              {/* 提示詞輸入 */}
              <div className="space-y-2">
                <label htmlFor="prompt" className="block text-purple-100 text-lg font-medium">
                  提示詞
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="prompt"
                    name="prompt"
                    value={prompt}
                    onChange={handlePromptChange}
                    className="w-full px-4 py-3 rounded-xl bg-white/20 border border-purple-300/30 
                             text-white placeholder-purple-200/70 focus:outline-none focus:ring-2 
                             focus:ring-purple-500 focus:border-transparent transition duration-200"
                    placeholder="描述您想要產生的圖片..."
                    required
                  />
                </div>
              </div>

              {/* 模型選擇 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="model" className="block text-purple-100 text-lg font-medium">
                    AI 模型
                  </label>
                  <select
                    id="model"
                    name="model"
                    value={model}
                    onChange={handleModelChange}
                    className="w-full px-4 py-3 rounded-xl bg-white/20 border border-purple-300/30 
                             text-white focus:outline-none focus:ring-2 focus:ring-purple-500 
                             focus:border-transparent transition duration-200"
                  >
                    {models.map((model) => (
                      <option key={model.id} value={model.id} className="bg-gray-800 text-white">
                        {model.id}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 尺寸選擇 */}
                <div className="space-y-2">
                  <label htmlFor="size" className="block text-purple-100 text-lg font-medium">
                    圖片尺寸
                  </label>
                  <select
                    id="size"
                    name="size"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/20 border border-purple-300/30 
                             text-white focus:outline-none focus:ring-2 focus:ring-purple-500 
                             focus:border-transparent transition duration-200"
                  >
                    <option value="512x512" className="bg-gray-800">512 x 512</option>
                    <option value="768x768" className="bg-gray-800">768 x 768</option>
                    <option value="1024x1024" className="bg-gray-800">1024 x 1024</option>
                  </select>
                </div>
              </div>

              {/* 進階選項 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl">
                  <div>
                    <h3 className="text-white font-medium">提示詞翻譯</h3>
                    <p className="text-purple-200 text-sm">自動翻譯提示詞為英文，以獲得更好的結果</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleEnhanceToggle}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full 
                              transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 
                              focus:ring-purple-500 focus:ring-offset-2 ${
                                enhance ? 'bg-purple-500' : 'bg-gray-500'
                              }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full 
                                   bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                     enhance ? 'translate-x-5' : 'translate-x-0'
                                   }`} 
                    />
                  </button>
                </div>

                <div className="space-y-2">
                  <label htmlFor="numSteps" className="block text-purple-100 text-lg font-medium">
                    產生步數 ({numSteps})
                  </label>
                  <input
                    type="range"
                    id="numSteps"
                    name="numSteps"
                    value={numSteps}
                    onChange={(e) => setNumSteps(parseInt(e.target.value, 10))}
                    min="4"
                    max="8"
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-purple-200 text-sm">
                    <span>較快</span>
                    <span>較精細</span>
                  </div>
                </div>
              </div>

              {/* 操作按鈕 */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 px-6 py-3 border border-purple-300/30 rounded-xl text-purple-100 
                           hover:bg-purple-500/20 transition duration-200 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  重設
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 
                           rounded-xl text-white font-medium hover:opacity-90 
                           transition duration-200 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      產生中...
                    </span>
                  ) : "開始產生"}
                </button>
              </div>
            </Form>

            {/* 結果顯示區域 */}
            {actionData && actionData.image && (
              <div className="mt-8 space-y-4">
                <h2 className="text-2xl font-bold text-white">產生結果</h2>
                <div className="relative group">
                  <img 
                    src={`data:image/jpeg;base64,${actionData.image}`} 
                    alt="Generated Image" 
                    className="w-full rounded-xl shadow-xl transition duration-300 group-hover:shadow-2xl"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent 
                                opacity-0 group-hover:opacity-100 transition duration-300 
                                rounded-xl flex items-end justify-center pb-4">
                    <button 
                      className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg 
                                text-white hover:bg-white/30 transition duration-200"
                      onClick={() => {
                        // 這裡可以加入下載圖片的功能
                      }}
                    >
                      下載圖片
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 錯誤訊息顯示 */}
            {actionData?.error && (
              <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
                <p className="text-red-200">{actionData.error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerateImage;
