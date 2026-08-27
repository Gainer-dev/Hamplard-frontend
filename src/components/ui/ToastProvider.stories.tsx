import type { Meta, StoryObj } from '@storybook/react';
import { ToastProvider, useToastContext } from './ToastProvider';
import { Button } from './Button';

function ToastShowcase() {
  const toast = useToastContext();

  return (
    <div className="space-y-4 p-8">
      <h2 className="text-2xl font-bold mb-6">Toast Notifications</h2>
      
      <div className="space-y-2">
        <Button
          variant="primary"
          onClick={() =>
            toast.success({
              title: 'Success!',
              description: 'Your changes have been saved successfully.',
            })
          }
        >
          Show Success
        </Button>
        
        <Button
          variant="danger"
          onClick={() =>
            toast.error({
              title: 'Error',
              description: 'Something went wrong. Please try again.',
            })
          }
        >
          Show Error
        </Button>
        
        <Button
          variant="secondary"
          onClick={() =>
            toast.warning({
              title: 'Warning',
              description: 'This action cannot be undone.',
            })
          }
        >
          Show Warning
        </Button>
        
        <Button
          variant="tertiary"
          onClick={() =>
            toast.info({
              title: 'Info',
              description: 'This is an informational message.',
            })
          }
        >
          Show Info
        </Button>
      </div>
    </div>
  );
}

const meta = {
  title: 'UI/ToastProvider',
  component: ToastProvider,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ToastProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ToastProvider>
      <ToastShowcase />
    </ToastProvider>
  ),
};
