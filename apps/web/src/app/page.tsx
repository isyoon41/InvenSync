import React from 'react';
import { Header } from '@/components';
import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      <Header firmName="IP Review Desk" userName="윤인식" userRole="Admin" />

      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <h1 className="text-5xl font-bold mb-6">
              Automate Your Trademark Review Process
            </h1>
            <p className="text-xl mb-8 opacity-90">
              Reduce first-stage review preparation time by 60% with AI-powered trademark analysis
            </p>
            <div className="flex gap-4">
              <Link
                href="/inquiries/new"
                className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100"
              >
                Create New Inquiry
              </Link>
              <Link
                href="/inquiries"
                className="px-6 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-blue-700"
              >
                View Inquiries
              </Link>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            Your Productivity Metrics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'Active Inquiries', value: '12', color: 'blue' },
              { label: 'Avg. Processing Time', value: '2.3 hrs', color: 'green' },
              { label: 'Reviews Completed', value: '48', color: 'purple' },
              { label: 'Time Saved', value: '156 hrs', color: 'orange' },
            ].map((stat, index) => (
              <div key={index} className="bg-white rounded-lg shadow p-6 text-center">
                <div className={`text-4xl font-bold text-${stat.color}-600 mb-2`}>
                  {stat.value}
                </div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-gray-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
              Key Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: 'Automated Parsing',
                  description:
                    'Extract mark names and goods descriptions automatically using AI',
                  icon: '📄',
                },
                {
                  title: 'Smart Candidates',
                  description:
                    'Generate relevant trademark candidates with AI suggestions',
                  icon: '🎯',
                },
                {
                  title: 'Comprehensive Search',
                  description: 'Search KIPRIS database and analyze similarity in seconds',
                  icon: '🔍',
                },
                {
                  title: 'AI-Generated Reports',
                  description:
                    'Automatically generate review reports with risk assessments',
                  icon: '📊',
                },
                {
                  title: 'Client Communication',
                  description: 'Create ready-to-send client reply drafts',
                  icon: '💬',
                },
                {
                  title: 'Team Collaboration',
                  description: 'Multi-user approval workflow for quality control',
                  icon: '👥',
                },
              ].map((feature, index) => (
                <div key={index} className="bg-white rounded-lg p-8 shadow-sm hover:shadow">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-blue-50 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to transform your trademark review process?
            </h2>
            <p className="text-gray-600 mb-6">
              Start creating inquiries and let AI handle the heavy lifting
            </p>
            <Link
              href="/inquiries"
              className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
            >
              Get Started
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm">&copy; 2024 InvenSync. All rights reserved.</p>
            <p className="text-xs mt-2">Patent Attorneys' Trademark Review Assistant</p>
          </div>
        </div>
      </footer>
    </>
  );
}
