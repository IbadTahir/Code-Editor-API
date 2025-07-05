import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Button } from './Button';
import { Input } from './Input';
import { aiAnalysisService } from '../services/aiAnalysisService';
import type { QuizGenerationRequest } from '../types';

interface AIQuizGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onQuizCreated: (evaluatorId: number) => void;
}

export const AIQuizGenerator: React.FC<AIQuizGeneratorProps> = ({
  isOpen,
  onClose,
  onQuizCreated
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState<QuizGenerationRequest>({
    language: 'python',
    difficulty: 'intermediate',
    question_count: 10,
    include_mcq: true,
    include_theoretical: true,
    topic: ''
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      const result = await aiAnalysisService.generateQuizAndCreateEvaluator(formData);
      
      toast.success(`✨ ${result.message}! Quiz created with ${result.quiz.questions.length} questions.`);
      onQuizCreated(result.evaluator_id);
      onClose();
      
      // Reset form
      setFormData({
        language: 'python',
        difficulty: 'intermediate',
        question_count: 10,
        include_mcq: true,
        include_theoretical: true,
        topic: ''
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate quiz');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🤖</span>
              <h2 className="text-2xl font-bold">AI Quiz Generator</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-blue-100 mt-2">
            Generate a comprehensive programming quiz tailored to test development skills
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Language Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Programming Language
            </label>            <select
              value={formData.language}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData((prev: QuizGenerationRequest) => ({ ...prev, language: e.target.value as QuizGenerationRequest['language'] }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="python">🐍 Python</option>
              <option value="javascript">🟨 JavaScript</option>
              <option value="java">☕ Java</option>
              <option value="go">🐹 Go</option>
            </select>
          </div>

          {/* Difficulty & Question Count */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty Level
              </label>              <select
                value={formData.difficulty}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData((prev: QuizGenerationRequest) => ({ ...prev, difficulty: e.target.value as QuizGenerationRequest['difficulty'] }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="beginner">🟢 Beginner</option>
                <option value="intermediate">🟡 Intermediate</option>
                <option value="advanced">🔴 Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Questions
              </label>              <Input
                type="number"
                min="5"
                max="20"
                value={formData.question_count}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((prev: QuizGenerationRequest) => ({ ...prev, question_count: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>
          </div>

          {/* Question Types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Question Types
            </label>
            <div className="space-y-3">
              <label className="flex items-center">                <input
                  type="checkbox"
                  checked={formData.include_mcq}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((prev: QuizGenerationRequest) => ({ ...prev, include_mcq: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">
                  📝 Multiple Choice Questions (MCQs)
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.include_theoretical}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((prev: QuizGenerationRequest) => ({ ...prev, include_theoretical: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">
                  💭 Theoretical & Conceptual Questions
                </span>
              </label>
            </div>
          </div>

          {/* Topic (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Specific Topic (Optional)
            </label>
            <Input
              type="text"
              placeholder="e.g., Data Structures, Web Development, Algorithms..."
              value={formData.topic || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((prev: QuizGenerationRequest) => ({ ...prev, topic: e.target.value }))}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty for general programming concepts
            </p>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-700 mb-2">Quiz Preview:</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• <strong>Language:</strong> {formData.language.toUpperCase()}</p>
              <p>• <strong>Difficulty:</strong> {formData.difficulty}</p>
              <p>• <strong>Questions:</strong> {formData.question_count}</p>
              <p>• <strong>Types:</strong> {[
                formData.include_mcq && 'MCQ',
                formData.include_theoretical && 'Theoretical'
              ].filter(Boolean).join(', ')}</p>
              {formData.topic && <p>• <strong>Topic:</strong> {formData.topic}</p>}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isGenerating || (!formData.include_mcq && !formData.include_theoretical)}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isGenerating ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Generating Quiz...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>🎯</span>
                  Generate Quiz
                </div>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
