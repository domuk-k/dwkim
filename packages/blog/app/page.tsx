import { FC } from 'react'

const HomePage: FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Welcome to My Blog</h1>
      <p className="text-lg text-muted-foreground">
        This is a personal blog built with Next.js, TypeScript, and Tailwind CSS.
      </p>
    </div>
  )
}

export default HomePage