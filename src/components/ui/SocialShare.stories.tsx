import type { Meta, StoryObj } from '@storybook/react';
import { SocialShare } from './SocialShare';

const meta = {
  title: 'UI/SocialShare',
  component: SocialShare,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    variant: {
      control: 'select',
      options: ['icon', 'label'],
    },
    courseTitle: {
      control: 'text',
    },
  },
} satisfies Meta<typeof SocialShare>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    courseTitle: 'Advanced React Patterns',
    variant: 'label',
    size: 'md',
  },
};

export const IconOnly: Story = {
  args: {
    courseTitle: 'Advanced React Patterns',
    variant: 'icon',
    size: 'md',
  },
};

export const Small: Story = {
  args: {
    courseTitle: 'Web Design Fundamentals',
    variant: 'label',
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    courseTitle: 'Full-Stack Development',
    variant: 'label',
    size: 'lg',
  },
};

export const CertificateShare: Story = {
  args: {
    courseTitle: 'Photography Essentials',
    url: 'https://hamplard.com/certificates/cert-12345',
    variant: 'label',
    size: 'md',
  },
};

export const InlineIcons: Story = {
  args: {
    courseTitle: 'UI/UX Design',
    variant: 'icon',
    size: 'lg',
  },
};
